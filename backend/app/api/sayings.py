from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.saying import Saying
from app.models.user import User
from app.schemas.pagination import PaginatedResponse, paginate
from app.schemas.saying import SayingCreate, SayingResponse, SayingUpdate
from app.services.edit_log import log_action
from app.services.locking import acquire_lock, is_locked, release_lock

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
    count_result = await db.execute(select(func.count()).select_from(Saying))
    total = count_result.scalar_one()

    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun dicton en base",
        )

    offset = date.today().toordinal() % total
    result = await db.execute(
        select(Saying).order_by(Saying.id).offset(offset).limit(1)
    )
    row = result.scalar_one()
    return _to_response(row)


@router.get(
    "",
    response_model=PaginatedResponse[SayingResponse],
    summary="Liste paginée des dictons",
)
async def list_sayings(
    type: Optional[str] = Query(default=None),
    localite: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Saying)

    if type is not None:
        query = query.where(Saying.type == type)
    if localite is not None:
        query = query.where(Saying.localite_origine.ilike(f"%{localite}%"))

    query = query.order_by(Saying.created_at.desc())

    result = await paginate(db, query, page, per_page)
    result["items"] = [_to_response(s) for s in result["items"]]
    return result


@router.post(
    "",
    response_model=SayingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un dicton",
)
async def create_saying(
    body: SayingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saying = Saying(
        terme_provencal=body.terme_provencal,
        localite_origine=body.localite_origine,
        traduction_sens_fr=body.traduction_sens_fr,
        type=body.type,
        contexte=body.contexte,
        source=body.source,
        created_by=current_user.id,
    )
    db.add(saying)
    await db.flush()

    await log_action(
        db,
        table_name="sayings",
        row_id=saying.id,
        action="INSERT",
        old_data=None,
        new_data={
            "terme_provencal": saying.terme_provencal,
            "localite_origine": saying.localite_origine,
            "traduction_sens_fr": saying.traduction_sens_fr,
            "type": saying.type,
            "contexte": saying.contexte,
            "source": saying.source,
        },
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(saying)
    return _to_response(saying, current_user.id)


@router.put("/{saying_id}", response_model=SayingResponse, summary="Modifier un dicton")
async def update_saying(
    saying_id: int,
    body: SayingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saying = await db.get(Saying, saying_id)
    if saying is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dicton introuvable",
        )

    await acquire_lock(db, Saying, saying_id, current_user.id)

    old_data = {
        "terme_provencal": saying.terme_provencal,
        "localite_origine": saying.localite_origine,
        "traduction_sens_fr": saying.traduction_sens_fr,
        "type": saying.type,
        "contexte": saying.contexte,
        "source": saying.source,
    }

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(saying, field, value)

    await log_action(
        db,
        table_name="sayings",
        row_id=saying_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=current_user.id,
    )

    await release_lock(db, Saying, saying_id)

    await db.commit()
    await db.refresh(saying)
    return _to_response(saying, current_user.id)


@router.delete("/{saying_id}", summary="Supprimer un dicton")
async def delete_saying(
    saying_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saying = await db.get(Saying, saying_id)
    if saying is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dicton introuvable",
        )

    if is_locked(saying, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élément verrouillé par un autre contributeur",
        )

    old_data = {
        "terme_provencal": saying.terme_provencal,
        "localite_origine": saying.localite_origine,
        "traduction_sens_fr": saying.traduction_sens_fr,
        "type": saying.type,
        "contexte": saying.contexte,
        "source": saying.source,
    }

    await log_action(
        db,
        table_name="sayings",
        row_id=saying_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=current_user.id,
    )

    await db.delete(saying)
    await db.commit()
    return {"message": "Supprimé"}
