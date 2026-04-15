from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import Depends

from app.core.database import get_db
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.schemas.dictionary import DictEntryResponse, ThemeCategoriesResponse, TranslationResponse
from app.schemas.pagination import PaginatedResponse, paginate

router = APIRouter(prefix="/dictionary", tags=["Dictionnaire"])

_SIMILARITY_THRESHOLD = 0.1


def _entry_to_response(entry: DictEntry) -> DictEntryResponse:
    return DictEntryResponse(
        id=entry.id,
        mot_fr=entry.mot_fr,
        synonyme_fr=entry.synonyme_fr,
        description=entry.description,
        theme=entry.theme,
        categorie=entry.categorie,
        translations=[
            TranslationResponse(
                id=t.id,
                graphie=t.graphie,
                source=t.source,
                traduction=t.traduction,
                region=t.region,
            )
            for t in entry.translations
        ],
    )


@router.get(
    "/themes",
    response_model=ThemeCategoriesResponse,
    summary="Thèmes et catégories",
)
async def list_themes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DictEntry.theme, DictEntry.categorie)
        .where(DictEntry.theme.isnot(None))
        .distinct()
        .order_by(DictEntry.theme, DictEntry.categorie)
    )
    rows = result.all()

    themes: dict[str, list[str]] = {}
    for theme, categorie in rows:
        if theme not in themes:
            themes[theme] = []
        if categorie and categorie not in themes[theme]:
            themes[theme].append(categorie)

    return ThemeCategoriesResponse(themes=themes)


@router.get(
    "/search",
    response_model=PaginatedResponse[DictEntryResponse],
    summary="Recherche Provençal → FR",
)
async def search_prov_to_fr(
    q: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Chercher dans les traductions (ILIKE d'abord)
    exact_ids_result = await db.execute(
        select(DictTranslation.entry_id)
        .where(DictTranslation.traduction.ilike(f"%{q}%"))
        .distinct()
    )
    exact_ids = [r[0] for r in exact_ids_result.all()]

    if exact_ids:
        query = (
            select(DictEntry)
            .where(DictEntry.id.in_(exact_ids))
            .options(selectinload(DictEntry.translations))
            .order_by(DictEntry.mot_fr.asc())
        )
    else:
        # Suggestions via similarité trigram
        sim_ids_result = await db.execute(
            select(DictTranslation.entry_id)
            .where(
                text("similarity(traduction, :q) > :threshold").bindparams(
                    q=q, threshold=_SIMILARITY_THRESHOLD
                )
            )
            .order_by(
                text("similarity(traduction, :q) DESC").bindparams(q=q)
            )
            .distinct()
        )
        sim_ids = [r[0] for r in sim_ids_result.all()]
        if not sim_ids:
            return {"items": [], "total": 0, "page": page, "per_page": per_page, "pages": 1}
        query = (
            select(DictEntry)
            .where(DictEntry.id.in_(sim_ids))
            .options(selectinload(DictEntry.translations))
            .order_by(DictEntry.mot_fr.asc())
        )

    result = await paginate(db, query, page, per_page)
    result["items"] = [_entry_to_response(e) for e in result["items"]]
    return result


@router.get(
    "",
    response_model=PaginatedResponse[DictEntryResponse],
    summary="Liste / recherche FR → Provençal",
)
async def list_dictionary(
    q: Optional[str] = Query(default=None),
    theme: Optional[str] = Query(default=None),
    categorie: Optional[str] = Query(default=None),
    graphie: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    if q:
        # Recherche textuelle FR→Prov — les filtres sont ignorés
        exact_query = (
            select(DictEntry)
            .where(DictEntry.mot_fr.ilike(f"%{q}%"))
            .options(selectinload(DictEntry.translations))
            .order_by(DictEntry.mot_fr.asc())
        )
        result = await paginate(db, exact_query, page, per_page)

        if result["total"] == 0:
            # Suggestions via pg_trgm
            suggestions_result = await db.execute(
                select(DictEntry.mot_fr)
                .where(
                    text("similarity(mot_fr, :q) > :threshold").bindparams(
                        q=q, threshold=_SIMILARITY_THRESHOLD
                    )
                )
                .order_by(text("similarity(mot_fr, :q) DESC").bindparams(q=q))
                .limit(5)
            )
            suggestions = [r[0] for r in suggestions_result.all()]
            return {
                "items": [],
                "total": 0,
                "page": page,
                "per_page": per_page,
                "pages": 1,
                "suggestions": suggestions,
            }

        result["items"] = [_entry_to_response(e) for e in result["items"]]
        return result

    # Pas de recherche — liste paginée avec filtres
    query = (
        select(DictEntry)
        .options(selectinload(DictEntry.translations))
        .order_by(DictEntry.mot_fr.asc())
    )

    if theme:
        query = query.where(DictEntry.theme == theme)
    if categorie:
        query = query.where(DictEntry.categorie == categorie)

    if graphie or source:
        # Filtrer via les traductions (JOIN)
        sub = select(DictTranslation.entry_id)
        if graphie:
            sub = sub.where(DictTranslation.graphie == graphie)
        if source:
            sub = sub.where(DictTranslation.source == source)
        sub = sub.distinct()
        query = query.where(DictEntry.id.in_(sub))

    result = await paginate(db, query, page, per_page)
    result["items"] = [_entry_to_response(e) for e in result["items"]]
    return result
