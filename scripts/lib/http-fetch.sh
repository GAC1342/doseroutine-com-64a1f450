#!/usr/bin/env bash
# http-fetch.sh — gzip/brotli-safe HTTP helpers for the production checks.
#
# Why this exists: a plain `curl -sSL <url> | grep foo` can silently miss
# content. Cloudflare (and most CDNs) will return gzip- or brotli-encoded HTML
# whenever the request advertises support, and some origins compress even for a
# request that did not ask. Piping those raw bytes into grep finds nothing, so a
# perfectly healthy deploy reads as "the marker is gone".
#
# fetch_body() below guarantees plain text:
#   1. `--compressed` asks curl to negotiate and transparently decode gzip/br;
#   2. the payload is still sniffed for the gzip magic bytes (1f 8b) and the
#      brotli/zstd cases curl could not decode, and decompressed in-process;
#   3. only then is the text handed back for grepping.
#
# Source this file: . "$(dirname "$0")/lib/http-fetch.sh"

# Decompress stdin when it is compressed; otherwise pass it through unchanged.
# Detection is by magic bytes, so it works no matter what Content-Encoding says.
decompress_stream() {
  local tmp magic
  tmp="$(mktemp)"
  cat > "$tmp"
  magic="$(head -c 4 "$tmp" | od -An -tx1 | tr -d ' \n')"
  case "$magic" in
    1f8b*)      gzip -dc  < "$tmp" 2>/dev/null || cat "$tmp" ;;  # gzip
    28b52ffd*)  zstd -dc  < "$tmp" 2>/dev/null || cat "$tmp" ;;  # zstd
    *)
      # Brotli has no magic number. If the bytes are not valid UTF-8 text and a
      # brotli decoder is available, try it before giving up.
      if ! LC_ALL=C grep -qI . "$tmp" 2>/dev/null && command -v brotli >/dev/null 2>&1; then
        brotli -dc < "$tmp" 2>/dev/null || cat "$tmp"
      else
        cat "$tmp"
      fi
      ;;
  esac
  rm -f "$tmp"
}

# fetch_body <url> [extra curl args...] — always plain, decompressed text.
fetch_body() {
  local url="$1"; shift || true
  curl -sSL --compressed --max-time "${HTTP_FETCH_TIMEOUT:-30}" "$@" "$url" | decompress_stream
}

# fetch_headers <url> — response headers only (never compressed).
fetch_headers() {
  local url="$1"; shift || true
  curl -sSIL --max-time "${HTTP_FETCH_TIMEOUT:-30}" "$@" "$url"
}

# status_of <url> — final HTTP status code after redirects.
status_of() {
  local url="$1"; shift || true
  curl -sSL --compressed --max-time "${HTTP_FETCH_TIMEOUT:-30}" -o /dev/null -w "%{http_code}" "$@" "$url"
}
