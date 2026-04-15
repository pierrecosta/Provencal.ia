from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.library_entry import LibraryEntry
from app.schemas.pagination import paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock


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


async def list_periodes(db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(distinct(LibraryEntry.periode))
        .where(LibraryEntry.periode.isnot(None))
        .order_by(LibraryEntry.periode)
    )
    return [r for (r,) in result.fetchall()]


async def list_library(
    db: AsyncSession,
    type: Literal["Histoire", "Légende"] | None,
    periode: str | None,
    lieu: str | None,
    page: int,
    per_page: int,
) -> dict:
    query = select(LibraryEntry).order_by(LibraryEntry.created_at.desc())

    if type:
        query = query.where(LibraryEntry.typologie == type)
    if periode:
        query = query.where(LibraryEntry.periode.ilike(f"%{periode}%"))
    if lieu:
        query = query.where(LibraryEntry.description_courte.ilike(f"%{lieu}%"))

    return await paginate(db, query, page, per_page)


async def get_library_entry(
    db: AsyncSession, entry_id: int
) -> tuple[LibraryEntry, str | None]:
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée introuvable",
        )

    translation_lang: str | None = None
    if entry.traduction_id is not None:
        linked = await db.get(LibraryEntry, entry.traduction_id)
        if linked is not None:
            translation_lang = linked.lang

    return entry, translation_lang


async def create_library_entry(
    db: AsyncSession, data, user_id: int
) -> LibraryEntry:
    if data.traduction_id is not None:
        target = await db.get(LibraryEntry, data.traduction_id)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrée liée introuvable",
            )

    entry = LibraryEntry(
        titre=data.titre,
        typologie=data.typologie,
        periode=data.periode,
        description_courte=data.description_courte,
        description_longue=data.description_longue,
        source_url=data.source_url,
        image_ref=data.image_ref,
        lang=data.lang,
        traduction_id=data.traduction_id,
        created_by=user_id,
    )
    db.add(entry)
    await db.flush()

    # Lien bidirectionnel
    if data.traduction_id is not None:
        target = await db.get(LibraryEntry, data.traduction_id)
        if target is not None:
            target.traduction_id = entry.id

    await log_action(
        db,
        table_name="library_entries",
        row_id=entry.id,
        action="INSERT",
        old_data=None,
        new_data=_to_dict(entry),
        user_id=user_id,
    )

    await db.commit()
    await db.refresh(entry)
    return entry


async def update_library_entry(
    db: AsyncSession, entry_id: int, data, user_id: int
) -> LibraryEntry:
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée introuvable",
        )

    await acquire_lock(db, LibraryEntry, entry_id, user_id)

    old_data = _to_dict(entry)
    update_data = data.model_dump(exclude_unset=True)

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
        user_id=user_id,
    )

    await release_lock(db, LibraryEntry, entry_id)

    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_library_entry(
    db: AsyncSession, entry_id: int, user_id: int
) -> dict:
    entry = await db.get(LibraryEntry, entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée introuvable",
        )

    if is_locked(entry, user_id):
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
        user_id=user_id,
    )

    await db.delete(entry)
    await db.commit()
    return {"message": "Entrée supprimée"}


async def rollback_library_entry(
    db: AsyncSession, entry_id: int, user_id: int
) -> dict:
    result = await rollback_last_action(db, "library_entries", entry_id, user_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    return result
