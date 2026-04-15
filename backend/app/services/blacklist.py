from datetime import datetime, timezone

from sqlalchemy import delete as sql_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token_blacklist import TokenBlacklist


async def revoke_token(
    db: AsyncSession, token: str, expires_at: datetime
) -> None:
    existing = await db.execute(
        select(TokenBlacklist.id).where(TokenBlacklist.token == token)
    )
    if existing.scalar_one_or_none() is not None:
        return
    # Colonne TIMESTAMP WITHOUT TIME ZONE — stocker en naive UTC
    naive_expires = expires_at.replace(tzinfo=None) if expires_at.tzinfo else expires_at
    entry = TokenBlacklist(token=token, expires_at=naive_expires)
    db.add(entry)
    await db.commit()


async def is_token_revoked(db: AsyncSession, token: str) -> bool:
    result = await db.execute(
        select(TokenBlacklist.id).where(TokenBlacklist.token == token)
    )
    return result.scalar_one_or_none() is not None


async def cleanup_expired_tokens(db: AsyncSession) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = await db.execute(
        sql_delete(TokenBlacklist).where(TokenBlacklist.expires_at < now)
    )
    await db.commit()
    return result.rowcount
