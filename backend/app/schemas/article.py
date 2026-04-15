import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

ARTICLE_CATEGORIES = [
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
]


class ArticleCreate(BaseModel):
    titre: str = Field(..., max_length=200)
    description: Optional[str] = Field(default=None, max_length=300)
    image_ref: Optional[str] = Field(default=None, max_length=500)
    source_url: Optional[str] = Field(default=None, max_length=500)
    date_publication: datetime.date
    auteur: Optional[str] = Field(default=None, max_length=100)
    categorie: Optional[str] = None

    @field_validator("categorie")
    @classmethod
    def validate_categorie(cls, v):
        if v is not None and v not in ARTICLE_CATEGORIES:
            raise ValueError(f"Catégorie invalide. Valeurs autorisées : {', '.join(ARTICLE_CATEGORIES)}")
        return v


class ArticleUpdate(BaseModel):
    titre: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=300)
    image_ref: Optional[str] = Field(default=None, max_length=500)
    source_url: Optional[str] = Field(default=None, max_length=500)
    date_publication: Optional[datetime.date] = None
    auteur: Optional[str] = Field(default=None, max_length=100)
    categorie: Optional[str] = None

    @field_validator("categorie")
    @classmethod
    def validate_categorie(cls, v):
        if v is not None and v not in ARTICLE_CATEGORIES:
            raise ValueError(f"Catégorie invalide. Valeurs autorisées : {', '.join(ARTICLE_CATEGORIES)}")
        return v


class ArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titre: str
    description: Optional[str] = None
    image_ref: Optional[str] = None
    source_url: Optional[str] = None
    date_publication: datetime.date
    auteur: Optional[str] = None
    categorie: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    locked_by: Optional[int] = None
    is_locked: bool = False
