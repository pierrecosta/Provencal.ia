import re

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dict_entry import DictEntry

# Tokenizer : sépare les mots alphabétiques des tokens non-alphab
_TOKEN_RE = re.compile(r"([a-zA-ZÀ-ÿ'-]+|[^a-zA-ZÀ-ÿ'-]+)", re.UNICODE)


def _pick_translation(entry: DictEntry) -> str:
    """Sélectionne la meilleure traduction : canonique d'abord, sinon la première."""
    for t in entry.translations:
        if t.graphie == "canonique":
            return t.traduction
    if entry.translations:
        return entry.translations[0].traduction
    return entry.mot_fr


async def translate_text(db: AsyncSession, text: str) -> dict:
    if not text.strip():
        return {"translated": text, "unknown_words": []}

    tokens = _TOKEN_RE.findall(text)

    words_lower = {
        tok.lower()
        for tok in tokens
        if re.match(r"^[a-zA-ZÀ-ÿ'-]+$", tok)
    }

    if words_lower:
        result = await db.execute(
            select(DictEntry)
            .where(func.lower(DictEntry.mot_fr).in_(words_lower))
            .options(selectinload(DictEntry.translations))
        )
        entries = result.scalars().all()
    else:
        entries = []

    translation_map: dict[str, str] = {
        entry.mot_fr.lower(): _pick_translation(entry)
        for entry in entries
    }

    unknown_set: list[str] = []
    seen_unknown: set[str] = set()
    translated_tokens: list[str] = []

    for tok in tokens:
        if re.match(r"^[a-zA-ZÀ-ÿ'-]+$", tok):
            key = tok.lower()
            if key in translation_map:
                translated_tokens.append(translation_map[key])
            else:
                translated_tokens.append(tok)
                if key not in seen_unknown:
                    unknown_set.append(tok)
                    seen_unknown.add(key)
        else:
            translated_tokens.append(tok)

    return {
        "translated": "".join(translated_tokens),
        "unknown_words": unknown_set,
    }
