import re

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.dict_entry import DictEntry
from app.schemas.translate import TranslateRequest, TranslateResponse

router = APIRouter(prefix="/translate", tags=["Traducteur"])

# Tokenizer : sépare les mots alphabétiques des tokens non-alphab (ponctuation, espaces, etc.)
_TOKEN_RE = re.compile(r"([a-zA-ZÀ-ÿ'-]+|[^a-zA-ZÀ-ÿ'-]+)", re.UNICODE)


def _pick_translation(entry: DictEntry) -> str:
    """Sélectionne la meilleure traduction : canonique d'abord, sinon la première."""
    for t in entry.translations:
        if t.graphie == "canonique":
            return t.traduction
    if entry.translations:
        return entry.translations[0].traduction
    return entry.mot_fr


@router.post("", response_model=TranslateResponse, summary="Traduire du français vers le provençal")
async def translate_text(
    body: TranslateRequest,
    db: AsyncSession = Depends(get_db),
):
    text = body.text
    if not text.strip():
        return TranslateResponse(translated=text, unknown_words=[])

    # Tokeniser en préservant la ponctuation
    tokens = _TOKEN_RE.findall(text)

    # Extraire les mots uniques (en minuscules pour la recherche)
    words_lower = {
        tok.lower()
        for tok in tokens
        if re.match(r"^[a-zA-ZÀ-ÿ'-]+$", tok)
    }

    # Charger en batch toutes les entrées correspondantes
    if words_lower:
        result = await db.execute(
            select(DictEntry)
            .where(func.lower(DictEntry.mot_fr).in_(words_lower))
            .options(selectinload(DictEntry.translations))
        )
        entries = result.scalars().all()
    else:
        entries = []

    # Construire un mapping mot_fr_lower → traduction
    translation_map: dict[str, str] = {
        entry.mot_fr.lower(): _pick_translation(entry)
        for entry in entries
    }

    # Reconstituer le texte traduit
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

    return TranslateResponse(
        translated="".join(translated_tokens),
        unknown_words=unknown_set,
    )
