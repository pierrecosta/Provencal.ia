from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agenda_event import AgendaEvent
from app.schemas.pagination import paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock


def _to_dict(row: AgendaEvent) -> dict:
    return {
        "titre": row.titre,
        "date_debut": str(row.date_debut),
        "date_fin": str(row.date_fin),
        "lieu": row.lieu,
        "description": row.description,
        "lien_externe": row.lien_externe,
    }


async def list_events(
    db: AsyncSession,
    archive: bool,
    lieu: str | None,
    annee: int | None,
    mois: int | None,
    page: int,
    per_page: int,
) -> dict:
    today = date.today()
    query = select(AgendaEvent)

    if archive:
        query = query.where(AgendaEvent.date_fin < today)
        query = query.order_by(AgendaEvent.date_debut.desc())
    else:
        query = query.where(AgendaEvent.date_fin >= today)
        query = query.order_by(AgendaEvent.date_debut.asc())

    if lieu:
        query = query.where(AgendaEvent.lieu.ilike(f"%{lieu}%"))
    if annee:
        query = query.where(extract("year", AgendaEvent.date_debut) == annee)
    if mois:
        query = query.where(extract("month", AgendaEvent.date_debut) == mois)

    return await paginate(db, query, page, per_page)


async def create_event(db: AsyncSession, data, user_id: int) -> AgendaEvent:
    event = AgendaEvent(
        titre=data.titre,
        date_debut=data.date_debut,
        date_fin=data.date_fin,
        lieu=data.lieu,
        description=data.description,
        lien_externe=data.lien_externe,
        created_by=user_id,
    )
    db.add(event)
    await db.flush()

    await log_action(
        db,
        table_name="agenda_events",
        row_id=event.id,
        action="INSERT",
        old_data=None,
        new_data=_to_dict(event),
        user_id=user_id,
    )

    await db.commit()
    await db.refresh(event)
    return event


async def update_event(
    db: AsyncSession, event_id: int, data, user_id: int
) -> AgendaEvent:
    event = await db.get(AgendaEvent, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement introuvable",
        )

    await acquire_lock(db, AgendaEvent, event_id, user_id)

    old_data = _to_dict(event)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await log_action(
        db,
        table_name="agenda_events",
        row_id=event_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=user_id,
    )

    await release_lock(db, AgendaEvent, event_id)

    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(
    db: AsyncSession, event_id: int, user_id: int
) -> dict:
    event = await db.get(AgendaEvent, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement introuvable",
        )

    if is_locked(event, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élément verrouillé par un autre contributeur",
        )

    old_data = _to_dict(event)

    await log_action(
        db,
        table_name="agenda_events",
        row_id=event_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=user_id,
    )

    await db.delete(event)
    await db.commit()
    return {"message": "Événement supprimé"}


async def rollback_event(
    db: AsyncSession, event_id: int, user_id: int
) -> dict:
    result = await rollback_last_action(db, "agenda_events", event_id, user_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
