import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class LibraryCreate(BaseModel):
    titre: str = Field(max_length=200)
    typologie: Optional[Literal["Histoire", "Légende"]] = None
    periode: Optional[str] = Field(None, max_length=200)
    description_courte: Optional[str] = Field(None, max_length=200)
    description_longue: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=500)
    image_ref: Optional[str] = Field(None, max_length=500)
    lang: str = Field("fr", max_length=2)
    traduction_id: Optional[int] = None


class LibraryUpdate(BaseModel):
    titre: Optional[str] = Field(None, max_length=200)
    typologie: Optional[Literal["Histoire", "Légende"]] = None
    periode: Optional[str] = Field(None, max_length=200)
    description_courte: Optional[str] = Field(None, max_length=200)
    description_longue: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=500)
    image_ref: Optional[str] = Field(None, max_length=500)
    lang: Optional[str] = Field(None, max_length=2)
    traduction_id: Optional[int] = None


class LibraryResponse(BaseModel):
    id: int
    titre: str
    typologie: Optional[str]
    periode: Optional[str]
    description_courte: Optional[str]
    description_longue: Optional[str]
    source_url: Optional[str]
    image_ref: Optional[str]
    lang: Optional[str]
    traduction_id: Optional[int]
    created_by: Optional[int]
    created_at: Optional[datetime.datetime]
    locked_by: Optional[int]
    is_locked: bool
    has_translation: bool

    model_config = ConfigDict(from_attributes=True)


class LibraryDetailResponse(LibraryResponse):
    translation_lang: Optional[str] = None
