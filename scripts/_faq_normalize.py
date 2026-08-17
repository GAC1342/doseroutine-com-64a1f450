"""Shared normalization helpers for FAQPage JSON-LD validators.

Python-side mirror of src/lib/faq-normalize.ts. Every Python validator
(scripts/validate-library-faq.py, scripts/report-library-faq-jsonld.py)
routes duplicate + trimmed checks through here so JS and Python agree.

Keep the rule (whitespace collapse + strip + lower) identical to the TS
helper. If you change one, change both.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Iterable, Sequence, TypeVar

T = TypeVar("T")

_WHITESPACE_RUN = re.compile(r"\s+")


def normalize_faq_text(value: object) -> str:
    """Collapse internal whitespace, strip ends, lowercase."""
    if value is None:
        return ""
    return _WHITESPACE_RUN.sub(" ", str(value).strip()).lower()


def is_trimmed(value: object) -> bool:
    """True when value is a str with no leading/trailing whitespace."""
    return isinstance(value, str) and value == value.strip()


def has_normalized_content(value: object) -> bool:
    """True when normalized text has any visible characters."""
    return len(normalize_faq_text(value)) > 0


def is_nonempty_str(value: object) -> bool:
    """True when value is a str with visible content (post-strip)."""
    return isinstance(value, str) and len(value.strip()) > 0


def equals_normalized(a: object, b: object) -> bool:
    """True when both values are equal after shared FAQ normalization.

    Mirrors src/lib/faq-normalize.ts `equalsNormalized`. Use for every
    FAQ JSON-LD string comparison (@type, @context, name, text) so
    trivial whitespace/case differences do not cause spurious failures.
    """
    return normalize_faq_text(a) == normalize_faq_text(b)


def type_matches_normalized(type_field: object, expected: str) -> bool:
    """JSON-LD @type may be str OR list[str]; match under normalization."""
    values = type_field if isinstance(type_field, list) else [type_field]
    return any(equals_normalized(t, expected) for t in values)


def context_matches_schema_org(context_field: object) -> bool:
    """True when any @context entry references schema.org after normalization."""
    values = context_field if isinstance(context_field, list) else [context_field]
    for c in values:
        if not isinstance(c, str):
            continue
        if normalize_faq_text(c).rstrip("/").endswith("schema.org"):
            return True
    return False


@dataclass(frozen=True)
class DuplicateGroup:
    key: str
    indices: tuple[int, ...]


def find_duplicate_groups(
    items: Sequence[T],
    extractor: Callable[[T, int], object],
) -> list[DuplicateGroup]:
    """Group items by normalize_faq_text(extractor(...)); keep groups of >=2."""
    buckets: dict[str, list[int]] = {}
    for i, item in enumerate(items):
        key = normalize_faq_text(extractor(item, i))
        buckets.setdefault(key, []).append(i)
    return [
        DuplicateGroup(key=k, indices=tuple(idxs))
        for k, idxs in buckets.items()
        if len(idxs) > 1
    ]


def format_duplicate_groups(
    groups: Iterable[DuplicateGroup], key_label: str = "value"
) -> list[str]:
    return [
        f'"{g.key[:80]}" at mainEntity[{",".join(str(i) for i in g.indices)}] ({key_label})'
        for g in groups
    ]
