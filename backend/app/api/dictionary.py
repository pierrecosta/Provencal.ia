from typing import Optional

import chardet
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import Depends

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.models.user import User
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


# ── Mapping colonnes CSV/XLSX → traductions ─────────────────────────────────────
# Indice 0-based des colonnes (ligne de données, sans en-tête)
# col0=Thème, col1=Catégorie, col2=Mot FR, col3=Synonyme FR, col4=Description
# col5=Traduction (canonique), col6..11=pre_mistralienne, col12=mistralienne

_TRAD_COLS: list[tuple[int, str, str]] = [
    (5, "canonique", ""),
    (6, "pre_mistralienne", "TradEG"),
    (7, "pre_mistralienne", "TradD"),
    (8, "pre_mistralienne", "TradA"),
    (9, "pre_mistralienne", "TradH"),
    (10, "pre_mistralienne", "TradAv"),
    (11, "pre_mistralienne", "TradP"),
    (12, "mistralienne", "TradX"),
]

_EXPECTED_COLS = 13


def _parse_rows_from_bytes(content: bytes, filename: str) -> list[list[str]]:
    """Retourne les lignes du fichier (sans l'en-tête) sous forme de listes de str."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "xlsx":
        import io
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(c) if c is not None else "" for c in row])
        return rows[1:]  # skip header

    if ext == "csv":
        detected = chardet.detect(content)
        encoding = detected.get("encoding") or "utf-8"
        try:
            text_data = content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            text_data = content.decode("utf-8", errors="replace")

        lines = text_data.splitlines()
        return [line.split(";") for line in lines[1:] if line.strip()]

    raise ValueError(f"Extension non supportée : .{ext}")


@router.post(
    "/import",
    summary="Importer le dictionnaire depuis un CSV ou XLSX",
    status_code=status.HTTP_200_OK,
)
async def import_dictionary(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("csv", "xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté — utilisez .csv ou .xlsx",
        )

    content = await file.read()

    try:
        rows = _parse_rows_from_bytes(content, filename)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de lire le fichier : {exc}",
        )

    imported_entries = 0
    imported_translations = 0

    for line_no, row in enumerate(rows, start=2):  # 1-based, line 1 = header
        if len(row) != _EXPECTED_COLS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ligne {line_no} : {len(row)} colonnes trouvées, {_EXPECTED_COLS} attendues",
            )

        theme = row[0].strip() or None
        categorie = row[1].strip() or None
        mot_fr = row[2].strip()
        synonyme_fr = row[3].strip() or None
        description = row[4].strip() or None

        if not mot_fr:
            continue  # ligne vide, ignorer

        # Vérifier qu'au moins une colonne de traduction est non vide
        trad_values = [row[col_idx].strip() for col_idx, _, _ in _TRAD_COLS]
        if not any(trad_values):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ligne {line_no} : aucune traduction trouvée",
            )

        # Vérifier doublon
        existing = await db.execute(
            select(DictEntry).where(
                and_(
                    DictEntry.mot_fr == mot_fr,
                    DictEntry.theme == theme,
                    DictEntry.categorie == categorie,
                )
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ligne {line_no} : doublon (mot_fr + thème + catégorie)",
            )

        entry = DictEntry(
            mot_fr=mot_fr,
            synonyme_fr=synonyme_fr,
            description=description,
            theme=theme,
            categorie=categorie,
        )
        db.add(entry)
        await db.flush()
        imported_entries += 1

        for col_idx, graphie, source in _TRAD_COLS:
            val = row[col_idx].strip()
            if not val:
                continue
            trans = DictTranslation(
                entry_id=entry.id,
                traduction=val[:500],
                graphie=graphie or None,
                source=source or None,
            )
            db.add(trans)
            imported_translations += 1

    await db.commit()
    return {"imported": imported_entries, "skipped": 0}
