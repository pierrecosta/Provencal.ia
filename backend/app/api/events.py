from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.agenda_event import AgendaEvent
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.schemas.pagination import PaginatedResponse, paginate
from app.services.edit_log import log_action
from app.services.locking import acquire_lock, is_locked, release_lock

router = APIRouter(prefix="/events", tags=["Agenda"])


def _to_response(row: AgendaEvent, current_user_id: int | None = None) -> EventResponse:
    return EventResponse(
        id=row.id,
        titre=row.titre,
        date_debut=row.date_debut,
        date_fin=row.date_fin,
        lieu=row.lieu,
        description=row.description,
        lien_externe=row.lien_externe,
        created_by=row.created_by,
        created_at=row.created_at,
        locked_by=row.locked_by,
        is_locked=is_locked(row, current_user_id) if current_user_id else row.locked_by is not None,
    )


def _to_dict(row: AgendaEvent) -> dict:
    return {
        "titre": row.titre,
        "date_debut": str(row.date_debut),
        "date_fin": str(row.date_fin),
        "lieu": row.lieu,
        "description": row.description,
        "lien_externe": row.lien_externe,
    }


@router.get(
    "",
    response_model=PaginatedResponse[EventResponse],
    summary="Liste des événements",
)
async def list_events(
    archive: bool = Query(default=False),
    lieu: Optional[str] = Query(default=None),
    annee: Optional[int] = Query(default=None),
    mois: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
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

    result = await paginate(db, query, page, per_page)
    result["items"] = [_to_response(e) for e in result["items"]]
    return result


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un événement",
)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = AgendaEvent(
        titre=body.titre,
        date_debut=body.date_debut,
        date_fin=body.date_fin,
        lieu=body.lieu,
        description=body.description,
        lien_externe=body.lien_externe,
        created_by=current_user.id,
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
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(event)
    return _to_response(event, current_user.id)


@router.put("/{event_id}", response_model=EventResponse, summary="Modifier un événement")
async def update_event(
    event_id: int,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(AgendaEvent, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement introuvable",
        )

    await acquire_lock(db, AgendaEvent, event_id, current_user.id)

    old_data = _to_dict(event)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await log_action(
        db,
        table_name="agenda_events",
        row_id=event_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=current_user.id,
    )

    await release_lock(db, AgendaEvent, event_id)

    await db.commit()
    await db.refresh(event)
    return _to_response(event, current_user.id)


@router.delete("/{event_id}", summary="Supprimer un événement")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(AgendaEvent, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement introuvable",
        )

    if is_locked(event, current_user.id):
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
        user_id=current_user.id,
    )

    await db.delete(event)
    await db.commit()
    return {"message": "Événement supprimé"}
