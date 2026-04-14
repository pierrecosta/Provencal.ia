import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DictTranslation(Base):
    __tablename__ = "dict_translations"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dict_entries.id", ondelete="CASCADE"), nullable=False
    )
    graphie: Mapped[str | None] = mapped_column(String(50))
    source: Mapped[str | None] = mapped_column(String(20))
    traduction: Mapped[str] = mapped_column(String(500), nullable=False)
    region: Mapped[str | None] = mapped_column(String(50))
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
            "idx_dict_translations_trgm",
            "traduction",
            postgresql_using="gin",
            postgresql_ops={"traduction": "gin_trgm_ops"},
        ),
    )
