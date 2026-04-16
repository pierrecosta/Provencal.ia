import chardet
from fastapi import HTTPException, status
from sqlalchemy import and_, delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation
from app.schemas.dictionary import (
    DictEntryDetailOut,
    DictEntryResponse,
    DictEntryUpdate,
    ThemeCategoriesResponse,
    TranslationResponse,
)
from app.schemas.pagination import paginate
from app.services.locking import is_locked

_SIMILARITY_THRESHOLD = 0.1

# ── Mapping colonnes CSV/XLSX → traductions ─────────────────────────────────────
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


async def list_themes(db: AsyncSession) -> ThemeCategoriesResponse:
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


async def search_prov_to_fr(
    db: AsyncSession,
    q: str,
    page: int,
    per_page: int,
) -> dict:
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
        )
        seen: set[int] = set()
        sim_ids: list[int] = []
        for (eid,) in sim_ids_result.all():
            if eid not in seen:
                seen.add(eid)
                sim_ids.append(eid)
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


async def list_dictionary(
    db: AsyncSession,
    q: str | None,
    theme: str | None,
    categorie: str | None,
    graphie: str | None,
    source: str | None,
    page: int,
    per_page: int,
) -> dict:
    if q:
        exact_query = (
            select(DictEntry)
            .where(DictEntry.mot_fr.ilike(f"%{q}%"))
            .options(selectinload(DictEntry.translations))
            .order_by(DictEntry.mot_fr.asc())
        )
        result = await paginate(db, exact_query, page, per_page)

        if result["total"] == 0:
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


async def import_dictionary(
    db: AsyncSession, content: bytes, filename: str
) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("csv", "xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté — utilisez .csv ou .xlsx",
        )

    try:
        rows = _parse_rows_from_bytes(content, filename)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de lire le fichier : {exc}",
        )

    imported_entries = 0
    imported_translations = 0

    for line_no, row in enumerate(rows, start=2):
        if len(row) != _EXPECTED_COLS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ligne {line_no} : {len(row)} colonnes trouvées, {_EXPECTED_COLS} attendues",
            )

        theme_val = row[0].strip() or None
        categorie_val = row[1].strip() or None
        mot_fr = row[2].strip()
        synonyme_fr = row[3].strip() or None
        description = row[4].strip() or None

        if not mot_fr:
            continue

        trad_values = [row[col_idx].strip() for col_idx, _, _ in _TRAD_COLS]
        if not any(trad_values):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ligne {line_no} : aucune traduction trouvée",
            )

        existing = await db.execute(
            select(DictEntry).where(
                and_(
                    DictEntry.mot_fr == mot_fr,
                    DictEntry.theme == theme_val,
                    DictEntry.categorie == categorie_val,
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
            theme=theme_val,
            categorie=categorie_val,
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


# ── Lecture détaillée ────────────────────────────────────────────────────────

async def get_entry_detail(db: AsyncSession, entry_id: int) -> DictEntryDetailOut | None:
    result = await db.execute(
        select(DictEntry)
        .where(DictEntry.id == entry_id)
        .options(selectinload(DictEntry.translations))
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return None
    return DictEntryDetailOut.model_validate(entry)


# ── Modification ─────────────────────────────────────────────────────────────

async def update_entry(
    db: AsyncSession,
    entry_id: int,
    data: DictEntryUpdate,
    user_id: int,
) -> DictEntryDetailOut:
    from app.services.edit_log import log_action

    result = await db.execute(
        select(DictEntry)
        .where(DictEntry.id == entry_id)
        .options(selectinload(DictEntry.translations))
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")

    if is_locked(entry, user_id):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Entrée verrouillée par un autre contributeur",
        )

    old_data = {
        "mot_fr": entry.mot_fr,
        "synonyme_fr": entry.synonyme_fr,
        "description": entry.description,
        "theme": entry.theme,
        "categorie": entry.categorie,
    }

    entry.mot_fr = data.mot_fr.strip()
    entry.synonyme_fr = data.synonyme_fr.strip() if data.synonyme_fr else None
    entry.description = data.description.strip() if data.description else None
    entry.theme = data.theme
    entry.categorie = data.categorie

    # Remplace toutes les traductions
    await db.execute(delete(DictTranslation).where(DictTranslation.entry_id == entry_id))
    for t in data.translations:
        db.add(DictTranslation(
            entry_id=entry_id,
            source=t.source or None,
            traduction=t.traduction,
            graphie=t.graphie or None,
            region=t.region or None,
        ))

    new_data = {
        "mot_fr": entry.mot_fr,
        "synonyme_fr": entry.synonyme_fr,
        "description": entry.description,
        "theme": entry.theme,
        "categorie": entry.categorie,
    }

    await log_action(
        db,
        table_name="dict_entries",
        row_id=entry_id,
        action="UPDATE",
        old_data=old_data,
        new_data=new_data,
        user_id=user_id,
    )

    await db.flush()
    await db.refresh(entry)
    return DictEntryDetailOut.model_validate(entry)


# ── Suppression ───────────────────────────────────────────────────────────────

async def delete_entry(
    db: AsyncSession,
    entry_id: int,
    user_id: int,
) -> None:
    from app.services.edit_log import log_action

    result = await db.execute(
        select(DictEntry).where(DictEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")

    if is_locked(entry, user_id):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Entrée verrouillée par un autre contributeur",
        )

    old_data = {
        "mot_fr": entry.mot_fr,
        "synonyme_fr": entry.synonyme_fr,
        "description": entry.description,
        "theme": entry.theme,
        "categorie": entry.categorie,
    }

    await log_action(
        db,
        table_name="dict_entries",
        row_id=entry_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=user_id,
    )

    await db.delete(entry)
    await db.flush()
