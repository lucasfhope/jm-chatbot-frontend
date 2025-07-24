import unicodedata


def normalize_text(s: str) -> str:
    return unicodedata.normalize("NFKD", s).strip().lower()