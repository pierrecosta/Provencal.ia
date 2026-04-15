from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.agenda_event import AgendaEvent
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.schemas.pagination import PaginatedResponse
from app.services.events import (
    create_event as svc_create,
    delete_event as svc_delete,
    list_events as svc_list,
    rollback_event as svc_rollback,
    update_event as svc_update,
)
from app.services.locking import is_locked

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


@router.get("", response_model=PaginatedResponse[EventResponse], summary="Liste des événements")
async def list_events(
    archive: bool = Query(default=False),
    lieu: Optional[str] = Query(default=None),
    annee: Optional[int] = Query(default=None),
    mois: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await svc_list(db, archive, lieu, annee, mois, page, per_page)
    result["items"] = [_to_response(e) for e in result["items"]]
    return result


@router.post("", response_model=EventResponse, status_code=201, summary="Créer un événement")
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await svc_create(db, body, current_user.id)
    return _to_response(event, current_user.id)


@router.put("/{event_id}", response_model=EventResponse, summary="Modifier un événement")
async def update_event(
    event_id: int,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await svc_update(db, event_id, body, current_user.id)
    return _to_response(event, current_user.id)


@router.delete("/{event_id}", summary="Supprimer un événement")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_delete(db, event_id, current_user.id)


@router.post("/{event_id}/rollback", summary="Annuler la dernière action sur un événement")
async def rollback_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_rollback(db, event_id, current_user.id)
