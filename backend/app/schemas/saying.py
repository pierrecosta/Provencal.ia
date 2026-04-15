import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class SayingCreate(BaseModel):
    terme_provencal: str = Field(..., max_length=500)
    localite_origine: str = Field(..., max_length=200)
    traduction_sens_fr: str
    type: Optional[Literal["Dicton", "Expression", "Proverbe"]] = None
    contexte: Optional[str] = None
    source: Optional[str] = Field(default=None, max_length=300)


class SayingUpdate(BaseModel):
    terme_provencal: Optional[str] = Field(default=None, max_length=500)
    localite_origine: Optional[str] = Field(default=None, max_length=200)
    traduction_sens_fr: Optional[str] = None
    type: Optional[Literal["Dicton", "Expression", "Proverbe"]] = None
    contexte: Optional[str] = None
    source: Optional[str] = Field(default=None, max_length=300)


class SayingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    terme_provencal: str
    localite_origine: str
    traduction_sens_fr: str
    type: Optional[str] = None
    contexte: Optional[str] = None
    source: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    locked_by: Optional[int] = None
    is_locked: bool = False
