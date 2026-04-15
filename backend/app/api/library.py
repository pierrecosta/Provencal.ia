from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.library_entry import LibraryEntry
from app.models.user import User
from app.schemas.library import (
    LibraryCreate,
    LibraryDetailResponse,
    LibraryResponse,
    LibraryUpdate,
)
from app.schemas.pagination import PaginatedResponse, paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock

router = APIRouter(prefix="/library", tags=["Bibliothèque"])


def _to_response(row: LibraryEntry, current_user_id: int | None = None) -> LibraryResponse:
    return LibraryResponse(
        id=row.id,
        titre=row.titre,
        typologie=row.typologie,
        periode=row.periode,
        description_courte=row.description_courte,
        description_longue=row.description_longue,
        source_url=row.source_url,
        image_ref=row.image_ref,
        lang=row.lang,
        traduction_id=row.traduction_id,
        created_by=row.created_by,
        created_at=row.created_at,
        locked_by=row.locked_by,
        is_locked=is_locked(row, current_user_id) if current_user_id else row.locked_by is not None,
        has_translation=row.traduction_id is not None,
    )


def _to_dict(row: LibraryEntry) -> dict:
    return {
        "titre": row.titre,
        "typologie": row.typologie,
        "periode": row.periode,
        "description_courte": row.description_courte,
        "description_longue": row.description_longue,
        "source_url": row.source_url,
        "image_ref": row.image_ref,
        "lang": row.lang,
        "traduction_id": row.traduction_id,
    }


@router.get(
    "/periodes",
    response_model=list[str],
    summary="Liste des périodes disponibles",
)
async def list_periodes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(distinct(LibraryEntry.periode))
        .where(LibraryEntry.periode.isnot(None))
        .order_by(LibraryEntry.periode)
    )
    return [r for (r,) in result.fetchall()]


@router.get(
    "",
    response_model=PaginatedResponse[LibraryResponse],
    summary="Liste des entrées de la bibliothèque",
)
async def list_library(
    type: Optional[Literal["Histoire", "Légende"]] = Query(default=None),
    periode: Optional[str] = Query(default=None),
    lieu: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(LibraryEntry).order_by(LibraryEntry.created_at.desc())

    if type:
        query = query.where(LibraryEntry.typologie == type)
    if periode:
        query = query.where(LibraryEntry.periode.ilike(f"%{periode}%"))
    if lieu:
        query = query.where(LibraryEntry.description_courte.ilike(f"%{lieu}%"))

    result = await paginate(db, query, page, per_page)
    result["items"] = [_to_response(e) for e in result["items"]]
    return result


@router.get(
    "/{entry_id}",
    response_model=LibraryDetailResponse,
    summary="Détail d'une entrée",
)
async def get_library_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")

    translation_lang: str | None = None
    if entry.traduction_id is not None:
        linked = await db.get(LibraryEntry, entry.traduction_id)
        if linked is not None:
            translation_lang = linked.lang

    resp = _to_response(entry)
    return LibraryDetailResponse(**resp.model_dump(), translation_lang=translation_lang)


@router.post(
    "",
    response_model=LibraryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une entrée",
)
async def create_library_entry(
    body: LibraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Vérification de la cible de traduction
    if body.traduction_id is not None:
        target = await db.get(LibraryEntry, body.traduction_id)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrée liée introuvable",
            )

    entry = LibraryEntry(
        titre=body.titre,
        typologie=body.typologie,
        periode=body.periode,
        description_courte=body.description_courte,
        description_longue=body.description_longue,
        source_url=body.source_url,
        image_ref=body.image_ref,
        lang=body.lang,
        traduction_id=body.traduction_id,
        created_by=current_user.id,
    )
    db.add(entry)
    await db.flush()

    # Lien bidirectionnel
    if body.traduction_id is not None:
        target = await db.get(LibraryEntry, body.traduction_id)
        if target is not None:
            target.traduction_id = entry.id

    await log_action(
        db,
        table_name="library_entries",
        row_id=entry.id,
        action="INSERT",
        old_data=None,
        new_data=_to_dict(entry),
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(entry)
    return _to_response(entry, current_user.id)


@router.put("/{entry_id}", response_model=LibraryResponse, summary="Modifier une entrée")
async def update_library_entry(
    entry_id: int,
    body: LibraryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")

    await acquire_lock(db, LibraryEntry, entry_id, current_user.id)

    old_data = _to_dict(entry)
    update_data = body.model_dump(exclude_unset=True)

    # Gestion du changement de traduction_id
    if "traduction_id" in update_data:
        new_tid = update_data["traduction_id"]
        old_tid = entry.traduction_id

        # Libérer l'ancien lien
        if old_tid is not None and old_tid != new_tid:
            old_linked = await db.get(LibraryEntry, old_tid)
            if old_linked is not None and old_linked.traduction_id == entry_id:
                old_linked.traduction_id = None

        # Créer le nouveau lien
        if new_tid is not None:
            new_target = await db.get(LibraryEntry, new_tid)
            if new_target is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Entrée liée introuvable",
                )
            new_target.traduction_id = entry_id

    for field, value in update_data.items():
        setattr(entry, field, value)

    await log_action(
        db,
        table_name="library_entries",
        row_id=entry_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=current_user.id,
    )

    await release_lock(db, LibraryEntry, entry_id)

    await db.commit()
    await db.refresh(entry)
    return _to_response(entry, current_user.id)


@router.delete("/{entry_id}", summary="Supprimer une entrée")
async def delete_library_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")

    if is_locked(entry, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élément verrouillé par un autre contributeur",
        )

    # Libérer le lien bidirectionnel
    if entry.traduction_id is not None:
        linked = await db.get(LibraryEntry, entry.traduction_id)
        if linked is not None and linked.traduction_id == entry_id:
            linked.traduction_id = None

    old_data = _to_dict(entry)

    await log_action(
        db,
        table_name="library_entries",
        row_id=entry_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=current_user.id,
    )

    await db.delete(entry)
    await db.commit()
    return {"message": "Entrée supprimée"}


@router.post("/{entry_id}/rollback", summary="Annuler la dernière action sur une entrée")
async def rollback_library_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await rollback_last_action(db, "library_entries", entry_id, current_user.id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    return result
