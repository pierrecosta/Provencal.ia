from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saying import Saying
from app.schemas.pagination import paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock


def _to_dict(row: Saying) -> dict:
    return {
        "terme_provencal": row.terme_provencal,
        "localite_origine": row.localite_origine,
        "traduction_sens_fr": row.traduction_sens_fr,
        "type": row.type,
        "contexte": row.contexte,
        "source": row.source,
    }


async def get_today_saying(db: AsyncSession) -> Saying:
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
    return result.scalar_one()


async def list_sayings(
    db: AsyncSession,
    type: str | None,
    localite: str | None,
    page: int,
    per_page: int,
) -> dict:
    query = select(Saying)

    if type is not None:
        query = query.where(Saying.type == type)
    if localite is not None:
        query = query.where(Saying.localite_origine.ilike(f"%{localite}%"))

    query = query.order_by(Saying.created_at.desc())
    return await paginate(db, query, page, per_page)


async def create_saying(db: AsyncSession, data, user_id: int) -> Saying:
    saying = Saying(
        terme_provencal=data.terme_provencal,
        localite_origine=data.localite_origine,
        traduction_sens_fr=data.traduction_sens_fr,
        type=data.type,
        contexte=data.contexte,
        source=data.source,
        created_by=user_id,
    )
    db.add(saying)
    await db.flush()

    await log_action(
        db,
        table_name="sayings",
        row_id=saying.id,
        action="INSERT",
        old_data=None,
        new_data=_to_dict(saying),
        user_id=user_id,
    )

    await db.commit()
    await db.refresh(saying)
    return saying


async def update_saying(
    db: AsyncSession, saying_id: int, data, user_id: int
) -> Saying:
    saying = await db.get(Saying, saying_id)
    if saying is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dicton introuvable",
        )

    await acquire_lock(db, Saying, saying_id, user_id)

    old_data = _to_dict(saying)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(saying, field, value)

    await log_action(
        db,
        table_name="sayings",
        row_id=saying_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=user_id,
    )

    await release_lock(db, Saying, saying_id)

    await db.commit()
    await db.refresh(saying)
    return saying


async def delete_saying(
    db: AsyncSession, saying_id: int, user_id: int
) -> dict:
    saying = await db.get(Saying, saying_id)
    if saying is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dicton introuvable",
        )

    if is_locked(saying, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élément verrouillé par un autre contributeur",
        )

    old_data = _to_dict(saying)

    await log_action(
        db,
        table_name="sayings",
        row_id=saying_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=user_id,
    )

    await db.delete(saying)
    await db.commit()
    return {"message": "Supprimé"}


async def rollback_saying(
    db: AsyncSession, saying_id: int, user_id: int
) -> dict:
    result = await rollback_last_action(db, "sayings", saying_id, user_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
