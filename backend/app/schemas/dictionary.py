from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class TranslationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    graphie: Optional[str] = None
    source: Optional[str] = None
    traduction: str
    region: Optional[str] = None


class DictEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mot_fr: str
    synonyme_fr: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[str] = None
    categorie: Optional[str] = None
    translations: list[TranslationResponse] = []


class DictEntryDetailOut(DictEntryResponse):
    locked_by: Optional[int] = None
    locked_at: Optional[datetime] = None


class DictTranslationIn(BaseModel):
    source: str
    traduction: str
    graphie: Optional[str] = None
    region: Optional[str] = None


class DictEntryUpdate(BaseModel):
    mot_fr: str
    synonyme_fr: Optional[str] = None
    description: Optional[str] = None
    theme: str
    categorie: str
    translations: list[DictTranslationIn]

    @field_validator("translations")
    @classmethod
    def at_least_one_translation(cls, v: list) -> list:
        if not v:
            raise ValueError("Au moins une traduction est requise")
        return v


class ThemeCategoriesResponse(BaseModel):
    themes: dict[str, list[str]]
