import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AProposBlocOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bloc: str
    contenu: str
    locked_by: Optional[int] = None
    locked_at: Optional[datetime.datetime] = None


class AProposOut(BaseModel):
    demarche: AProposBlocOut
    sources: AProposBlocOut
    contributors: list[str]


class AProposBlocUpdate(BaseModel):
    contenu: str
