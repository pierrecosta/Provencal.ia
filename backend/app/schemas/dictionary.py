from typing import Optional

from pydantic import BaseModel, ConfigDict


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


class ThemeCategoriesResponse(BaseModel):
    themes: dict[str, list[str]]
