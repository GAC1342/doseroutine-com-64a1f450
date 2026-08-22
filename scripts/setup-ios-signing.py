#!/usr/bin/env python3
"""Create a matched Apple Distribution certificate and App Store profile.

This avoids Codemagic's fetch-signing-files matching loop by creating the
certificate from the exact private key that is imported into the build keychain.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import jwt
import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


API_ROOT = "https://api.appstoreconnect.apple.com/v1"
DISTRIBUTION_TYPES = {"DISTRIBUTION", "IOS_DISTRIBUTION"}
REQUIRED_CAPABILITIES = {
    "ASSOCIATED_DOMAINS",
    "HEALTHKIT",
    "SIGN_IN_WITH_APPLE",
}


def api_token() -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "iss": os.environ["APP_STORE_CONNECT_ISSUER_ID"],
            "iat": now,
            "exp": now + 20 * 60,
            "aud": "appstoreconnect-v1",
        },
        os.environ["APP_STORE_CONNECT_PRIVATE_KEY"],
        algorithm="ES256",
        headers={"kid": os.environ["APP_STORE_CONNECT_KEY_ID"], "typ": "JWT"},
    )


class AppleApi:
    def __init__(self) -> None:
        self.headers = {
            "Authorization": f"Bearer {api_token()}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, path: str, **kwargs: object) -> requests.Response:
        response = requests.request(
            method,
            f"{API_ROOT}{path}",
            headers=self.headers,
            timeout=45,
            **kwargs,
        )
        if response.status_code >= 400:
            detail = response.text[:1000]
            raise RuntimeError(f"Apple API {method} {path} returned {response.status_code}: {detail}")
        return response

    def list_data(self, path: str, params: dict[str, str] | None = None) -> list[dict]:
        return self.request("GET", path, params=params).json().get("data", [])


def load_or_create_key(path: Path) -> rsa.RSAPrivateKey:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        key = serialization.load_pem_private_key(path.read_bytes(), password=None)
        if not isinstance(key, rsa.RSAPrivateKey):
            raise RuntimeError("Cached iOS signing key is not an RSA private key")
        print("Using the stable cached iOS Distribution private key.")
        return key

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )
    path.chmod(0o600)
    print("Created a stable iOS Distribution private key.")
    return key


def public_key_bytes(key: object) -> bytes:
    return key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def matching_certificate(api: AppleApi, key: rsa.RSAPrivateKey) -> dict | None:
    expected = public_key_bytes(key)
    for item in api.list_data("/certificates", {"limit": "200"}):
        attrs = item.get("attributes", {})
        if attrs.get("certificateType") not in DISTRIBUTION_TYPES:
            continue
        content = attrs.get("certificateContent")
        if not content:
            continue
        try:
            certificate = x509.load_der_x509_certificate(base64.b64decode(content))
        except (ValueError, TypeError):
            continue
        if public_key_bytes(certificate) == expected:
            print(f"Reusing matched Apple Distribution certificate {item.get('id')}.")
            return item
    return None


def delete_distribution_certificates(api: AppleApi) -> None:
    certificates = api.list_data("/certificates", {"limit": "200"})
    stale = [
        item
        for item in certificates
        if item.get("attributes", {}).get("certificateType") in DISTRIBUTION_TYPES
    ]
    for item in stale:
        certificate_id = item.get("id")
        if not certificate_id:
            continue
        response = requests.delete(
            f"{API_ROOT}/certificates/{certificate_id}",
            headers=api.headers,
            timeout=45,
        )
        if response.status_code not in (200, 202, 204, 404):
            raise RuntimeError(
                f"Could not remove stale Distribution certificate {certificate_id}: "
                f"Apple returned {response.status_code} {response.text[:500]}"
            )
        print(f"Removed stale unmatched Distribution certificate {certificate_id}.")

    if not stale:
        return
    for attempt in range(1, 19):
        remaining = {
            item.get("id")
            for item in api.list_data("/certificates", {"limit": "200"})
            if item.get("attributes", {}).get("certificateType") in DISTRIBUTION_TYPES
        }
        if not remaining:
            print("Apple confirmed stale Distribution certificates are removed.")
            return
        print(f"Waiting for Apple certificate removal ({attempt}/18)...")
        time.sleep(10)
    raise RuntimeError("Apple did not finish removing stale Distribution certificates within 3 minutes")


def create_certificate(api: AppleApi, key: rsa.RSAPrivateKey) -> dict:
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "DoseRoutine Codemagic")]))
        .sign(key, hashes.SHA256())
    )
    csr_text = csr.public_bytes(serialization.Encoding.PEM).decode("ascii")
    payload = {
        "data": {
            "type": "certificates",
            "attributes": {
                "certificateType": "IOS_DISTRIBUTION",
                "csrContent": csr_text,
            },
        }
    }
    item = api.request("POST", "/certificates", data=json.dumps(payload)).json()["data"]
    certificate = x509.load_der_x509_certificate(
        base64.b64decode(item["attributes"]["certificateContent"])
    )
    if public_key_bytes(certificate) != public_key_bytes(key):
        raise RuntimeError("Apple returned a certificate that does not match the generated private key")
    print(f"Created and verified matched Apple Distribution certificate {item.get('id')}.")
    return item


def get_bundle_id(api: AppleApi, identifier: str) -> str:
    rows = api.list_data("/bundleIds", {"filter[identifier]": identifier, "limit": "10"})
    exact = [row for row in rows if row.get("attributes", {}).get("identifier") == identifier]
    if len(exact) != 1:
        raise RuntimeError(f"Expected one Apple bundle ID record for {identifier}, found {len(exact)}")
    return str(exact[0]["id"])


def enable_required_capabilities(api: AppleApi, bundle_id: str) -> None:
    """Enable ordinary app capabilities before creating a new profile.

    HealthKit's separately approved clinical-records access is intentionally
    not requested. DoseRoutine reads standard fitness/body data only.
    """
    enabled = {
        str(item.get("attributes", {}).get("capabilityType"))
        for item in api.list_data(
            f"/bundleIds/{bundle_id}/bundleIdCapabilities", {"limit": "200"}
        )
    }
    for capability_type in sorted(REQUIRED_CAPABILITIES):
        if capability_type in enabled:
            print(f"Bundle capability already enabled: {capability_type}")
            continue
        payload = {
            "data": {
                "type": "bundleIdCapabilities",
                "attributes": {"capabilityType": capability_type},
                "relationships": {
                    "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}}
                },
            }
        }
        api.request("POST", "/bundleIdCapabilities", data=json.dumps(payload))
        print(f"Enabled bundle capability: {capability_type}")


def replace_profile(api: AppleApi, bundle_id: str, certificate_id: str, name: str) -> bytes:
    # Apple does not accept filter[bundleId] on GET /profiles. Use the
    # bundle ID relationship endpoint, then filter profile type locally.
    for profile in api.list_data(f"/bundleIds/{bundle_id}/profiles", {"limit": "200"}):
        if profile.get("attributes", {}).get("profileType") != "IOS_APP_STORE":
            continue
        profile_id = profile.get("id")
        if profile_id:
            response = requests.delete(
                f"{API_ROOT}/profiles/{profile_id}", headers=api.headers, timeout=45
            )
            if response.status_code not in (200, 202, 204, 404):
                raise RuntimeError(
                    f"Could not remove old App Store profile {profile_id}: {response.status_code}"
                )

    payload = {
        "data": {
            "type": "profiles",
            "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}},
                "certificates": {
                    "data": [{"type": "certificates", "id": certificate_id}]
                },
            },
        }
    }
    item = api.request("POST", "/profiles", data=json.dumps(payload)).json()["data"]
    print(f"Created App Store profile {item.get('attributes', {}).get('name', item.get('id'))}.")
    return base64.b64decode(item["attributes"]["profileContent"])


APPLE_CHAIN_URLS = (
    "https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer",
    "https://www.apple.com/certificateauthority/AppleWWDRCAG6.cer",
    "https://www.apple.com/certificateauthority/AppleIncRootCertificate.cer",
    "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
)


def download_apple_chain(output_dir: Path) -> Path | None:
    """Apple's intermediate CAs must be inside the .p12, otherwise macOS
    imports the key/cert but `security find-identity -v` reports no valid
    codesigning identity because the chain cannot be built."""
    pems: list[bytes] = []
    for url in APPLE_CHAIN_URLS:
        try:
            response = requests.get(url, timeout=30)
            if response.status_code >= 400:
                print(f"WARNING: could not download {url} ({response.status_code}).")
                continue
            data = response.content
            try:
                cert = x509.load_der_x509_certificate(data)
            except Exception:
                cert = x509.load_pem_x509_certificate(data)
            pems.append(cert.public_bytes(serialization.Encoding.PEM))
        except Exception as exc:  # pragma: no cover - network only
            print(f"WARNING: could not download {url}: {exc}")
    if not pems:
        print("WARNING: no Apple intermediate certificates were downloaded.")
        return None
    chain_path = output_dir / "apple_chain.pem"
    chain_path.write_bytes(b"".join(pems))
    print(f"Bundled {len(pems)} Apple CA certificate(s) into the .p12 chain.")
    return chain_path


def write_signing_files(
    key_path: Path,
    certificate_item: dict,
    profile: bytes,
    output_dir: Path,
    p12_password: str,
) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    certificate_der = base64.b64decode(certificate_item["attributes"]["certificateContent"])
    certificate = x509.load_der_x509_certificate(certificate_der)
    certificate_pem = output_dir / "doseroutine_distribution.cer.pem"
    certificate_pem.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    chain_path = download_apple_chain(output_dir)
    p12_path = output_dir / "doseroutine_distribution.p12"
    command = [
        "openssl",
        "pkcs12",
        "-export",
        "-inkey",
        str(key_path),
        "-in",
        str(certificate_pem),
        "-name",
        certificate.subject.rfc4514_string(),
        "-out",
        str(p12_path),
        "-passout",
        f"pass:{p12_password}",
    ]
    if chain_path is not None:
        command.extend(["-certfile", str(chain_path)])
    subprocess.run(command, check=True)
    profile_path = output_dir / "doseroutine_app_store.mobileprovision"
    profile_path.write_bytes(profile)
    p12_path.chmod(0o600)
    profile_path.chmod(0o600)
    if chain_path is not None:
        print(f"CHAIN_PATH={chain_path}")
    return p12_path, profile_path



def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-id", required=True)
    parser.add_argument("--key-file", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    p12_password = os.environ.get("DIRECT_P12_PASSWORD")
    if not p12_password:
        raise RuntimeError("DIRECT_P12_PASSWORD is required")

    api = AppleApi()
    key = load_or_create_key(args.key_file)
    certificate = matching_certificate(api, key)
    if certificate is None:
        print("No Apple Distribution certificate matches this build key.")
        delete_distribution_certificates(api)
        certificate = create_certificate(api, key)

    bundle_resource_id = get_bundle_id(api, args.bundle_id)
    enable_required_capabilities(api, bundle_resource_id)
    timestamp = dt.datetime.now(dt.UTC).strftime("%Y%m%d-%H%M%S")
    profile = replace_profile(
        api,
        bundle_resource_id,
        str(certificate["id"]),
        f"DoseRoutine App Store {timestamp}",
    )
    p12_path, profile_path = write_signing_files(
        args.key_file, certificate, profile, args.output_dir, p12_password
    )
    print(f"P12_PATH={p12_path}")
    print(f"PROFILE_PATH={profile_path}")
    print("DIRECT_IOS_SIGNING_SETUP_PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: direct iOS signing setup failed: {exc}", file=sys.stderr)
        raise SystemExit(1)