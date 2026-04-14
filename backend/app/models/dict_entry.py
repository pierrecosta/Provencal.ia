import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DictEntry(Base):
    __tablename__ = "dict_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    mot_fr: Mapped[str] = mapped_column(String(200), nullable=False)
    synonyme_fr: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    theme: Mapped[str | None] = mapped_column(String(100))
    categorie: Mapped[str | None] = mapped_column(String(100))
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
        Index(
            "idx_dict_entries_mot_fr_trgm",
            "mot_fr",
            postgresql_using="gin",
            postgresql_ops={"mot_fr": "gin_trgm_ops"},
        ),
    )
