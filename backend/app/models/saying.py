import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Saying(Base):
    __tablename__ = "sayings"

    id: Mapped[int] = mapped_column(primary_key=True)
    terme_provencal: Mapped[str] = mapped_column(Text, nullable=False)
    localite_origine: Mapped[str] = mapped_column(String(200), nullable=False)
    traduction_sens_fr: Mapped[str] = mapped_column(Text, nullable=False)
    # 'Dicton' | 'Expression' | 'Proverbe'
    type: Mapped[str | None] = mapped_column(String(30))
    contexte: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(300))
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
            "type IN ('Dicton', 'Expression', 'Proverbe')", name="chk_type"
        ),
        Index(
            "idx_sayings_terme_trgm",
            "terme_provencal",
            postgresql_using="gin",
            postgresql_ops={"terme_provencal": "gin_trgm_ops"},
        ),
    )
