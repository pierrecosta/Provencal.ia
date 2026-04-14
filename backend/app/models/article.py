import datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

_CATEGORIES = (
    "Langue & Culture",
    "Littérature",
    "Poésie",
    "Histoire & Mémoire",
    "Traditions & Fêtes",
    "Musique",
    "Danse",
    "Gastronomie",
    "Artisanat",
    "Patrimoine bâti",
    "Environnement",
    "Personnalités",
    "Associations",
    "Enseignement",
    "Économie locale",
    "Numismatique & Archives",
    "Immigration & Diaspora",
    "Jeunesse",
    "Régionalisme & Politique linguistique",
    "Divers",
)


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300))
    image_ref: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(500))
    date_publication: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    auteur: Mapped[str | None] = mapped_column(String(100))
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
        CheckConstraint(
            "categorie IN ({})".format(
                ", ".join(f"'{c}'" for c in _CATEGORIES)
            ),
            name="chk_categorie",
        ),
    )
