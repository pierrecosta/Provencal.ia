import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EventCreate(BaseModel):
    titre: str = Field(..., max_length=200)
    date_debut: datetime.date
    date_fin: datetime.date
    lieu: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    lien_externe: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check_dates(self):
        if self.date_fin < self.date_debut:
            raise ValueError("date_fin doit être >= date_debut")
        return self


class EventUpdate(BaseModel):
    titre: Optional[str] = Field(default=None, max_length=200)
    date_debut: Optional[datetime.date] = None
    date_fin: Optional[datetime.date] = None
    lieu: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    lien_externe: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check_dates(self):
        if self.date_debut is not None and self.date_fin is not None:
            if self.date_fin < self.date_debut:
                raise ValueError("date_fin doit être >= date_debut")
        return self


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titre: str
    date_debut: datetime.date
    date_fin: datetime.date
    lieu: Optional[str] = None
    description: Optional[str] = None
    lien_externe: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    locked_by: Optional[int] = None
    is_locked: bool = False
