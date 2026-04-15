from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

LOCK_TIMEOUT_MINUTES = 30


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_locked(row, current_user_id: int) -> bool:
    if row.locked_by is None or row.locked_at is None:
        return False
    expiry = row.locked_at + timedelta(minutes=LOCK_TIMEOUT_MINUTES)
    return _utcnow() < expiry and row.locked_by != current_user_id


async def acquire_lock(
    db: AsyncSession, model_class, row_id: int, user_id: int
) -> bool:
    result = await db.execute(
        model_class.__table__.select().where(model_class.id == row_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Élément introuvable",
        )

    if row.locked_by is not None and row.locked_at is not None:
        expiry = row.locked_at + timedelta(minutes=LOCK_TIMEOUT_MINUTES)
        if _utcnow() < expiry and row.locked_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Élément verrouillé par un autre contributeur",
            )

    await db.execute(
        update(model_class)
        .where(model_class.id == row_id)
        .values(locked_by=user_id, locked_at=_utcnow())
    )
    await db.flush()
    return True


async def release_lock(
    db: AsyncSession, model_class, row_id: int
) -> None:
    await db.execute(
        update(model_class)
        .where(model_class.id == row_id)
        .values(locked_by=None, locked_at=None)
    )
    await db.flush()
