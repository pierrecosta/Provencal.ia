from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.translate import TranslateRequest, TranslateResponse
from app.services.translate import translate_text as svc_translate

router = APIRouter(prefix="/translate", tags=["Traducteur"])


@router.post("", response_model=TranslateResponse, summary="Traduire du français vers le provençal")
async def translate_text(
    body: TranslateRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await svc_translate(db, body.text)
    return TranslateResponse(**result)
