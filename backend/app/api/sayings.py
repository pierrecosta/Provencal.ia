from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.saying import Saying
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.saying import SayingCreate, SayingResponse, SayingUpdate
from app.services.locking import is_locked
from app.services.sayings import (
    create_saying as svc_create,
    delete_saying as svc_delete,
    get_today_saying as svc_today,
    list_sayings as svc_list,
    rollback_saying as svc_rollback,
    update_saying as svc_update,
)

router = APIRouter(prefix="/sayings", tags=["Mémoire vivante"])


def _to_response(row: Saying, current_user_id: int | None = None) -> SayingResponse:
    return SayingResponse(
        id=row.id,
        terme_provencal=row.terme_provencal,
        localite_origine=row.localite_origine,
        traduction_sens_fr=row.traduction_sens_fr,
        type=row.type,
        contexte=row.contexte,
        source=row.source,
        created_by=row.created_by,
        created_at=row.created_at,
        locked_by=row.locked_by,
        is_locked=is_locked(row, current_user_id) if current_user_id else row.locked_by is not None,
    )


@router.get("/today", response_model=SayingResponse, summary="Terme du jour")
async def saying_of_the_day(db: AsyncSession = Depends(get_db)):
    row = await svc_today(db)
    return _to_response(row)


@router.get("", response_model=PaginatedResponse[SayingResponse], summary="Liste paginée des dictons")
async def list_sayings(
    type: Optional[str] = Query(default=None),
    localite: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await svc_list(db, type, localite, page, per_page)
    result["items"] = [_to_response(s) for s in result["items"]]
    return result


@router.post("", response_model=SayingResponse, status_code=201, summary="Créer un dicton")
async def create_saying(
    body: SayingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saying = await svc_create(db, body, current_user.id)
    return _to_response(saying, current_user.id)


@router.put("/{saying_id}", response_model=SayingResponse, summary="Modifier un dicton")
async def update_saying(
    saying_id: int,
    body: SayingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saying = await svc_update(db, saying_id, body, current_user.id)
    return _to_response(saying, current_user.id)


@router.delete("/{saying_id}", summary="Supprimer un dicton")
async def delete_saying(
    saying_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_delete(db, saying_id, current_user.id)


@router.post("/{saying_id}/rollback", summary="Annuler la dernière action sur un dicton")
async def rollback_saying(
    saying_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_rollback(db, saying_id, current_user.id)
