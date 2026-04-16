import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AProposContent(Base):
    __tablename__ = "a_propos_content"

    id: Mapped[int] = mapped_column(primary_key=True)
    bloc: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    contenu: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    locked_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    locked_at: Mapped[datetime.datetime | None] = mapped_column(DateTime)
    updated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "bloc IN ('demarche', 'sources')", name="chk_bloc"
        ),
    )
