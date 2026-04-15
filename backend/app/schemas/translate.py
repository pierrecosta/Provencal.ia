from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(max_length=5000)


class TranslateResponse(BaseModel):
    translated: str
    unknown_words: list[str]
