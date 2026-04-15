from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.api.blacklist import token_blacklist
from app.api.deps import get_current_user, oauth2_scheme

router = APIRouter(prefix="/auth", tags=["Authentification"])

_INVALID_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Identifiant ou mot de passe incorrect",
    headers={"WWW-Authenticate": "Bearer"},
)


@router.post("/login", response_model=TokenResponse, summary="Connexion contributeur")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.pseudo == body.pseudo))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise _INVALID_CREDENTIALS_ERROR

    token = create_access_token({"sub": user.pseudo})
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/logout", summary="Déconnexion contributeur")
async def logout(
    _current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
) -> dict:
    token_blacklist.add(token)
    return {"message": "Déconnexion réussie"}
