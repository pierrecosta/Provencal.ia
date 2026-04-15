import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(
        String(500), unique=True, nullable=False, index=True
    )
    revoked_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
