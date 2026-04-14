from pydantic import BaseModel


class LoginRequest(BaseModel):
    pseudo: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
