import datetime

from sqlalchemy import CHAR, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LibraryEntry(Base):
    __tablename__ = "library_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    # 'Histoire' | 'Légende'
    typologie: Mapped[str | None] = mapped_column(String(20))
    periode: Mapped[str | None] = mapped_column(String(200))
    description_courte: Mapped[str | None] = mapped_column(String(200))
    description_longue: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(500))
    image_ref: Mapped[str | None] = mapped_column(String(500))
    lang: Mapped[str | None] = mapped_column(CHAR(2), server_default="fr")
    traduction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("library_entries.id", ondelete="SET NULL")
    )
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
        CheckConstraint(
            "typologie IN ('Histoire', 'Légende')", name="chk_typologie"
        ),
    )
