import datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AgendaEvent(Base):
    __tablename__ = "agenda_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    date_debut: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    lieu: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000))
    lien_externe: Mapped[str | None] = mapped_column(String(500))
    locked_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    locked_at: Mapped[datetime.datetime | None] = mapped_column(DateTime)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("date_fin >= date_debut", name="chk_dates"),
    )
