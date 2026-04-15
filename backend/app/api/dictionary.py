from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dictionary import DictEntryResponse, ThemeCategoriesResponse
from app.schemas.pagination import PaginatedResponse
from app.services.dictionary import (
    import_dictionary as svc_import,
    list_dictionary as svc_list,
    list_themes as svc_themes,
    search_prov_to_fr as svc_search_prov,
)

router = APIRouter(prefix="/dictionary", tags=["Dictionnaire"])


@router.get("/themes", response_model=ThemeCategoriesResponse, summary="Thèmes et catégories")
async def list_themes(db: AsyncSession = Depends(get_db)):
    return await svc_themes(db)


@router.get("/search", response_model=PaginatedResponse[DictEntryResponse], summary="Recherche Provençal → FR")
async def search_prov_to_fr(
    q: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await svc_search_prov(db, q, page, per_page)


@router.get("", response_model=PaginatedResponse[DictEntryResponse], summary="Liste / recherche FR → Provençal")
async def list_dictionary(
    q: Optional[str] = Query(default=None),
    theme: Optional[str] = Query(default=None),
    categorie: Optional[str] = Query(default=None),
    graphie: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await svc_list(db, q, theme, categorie, graphie, source, page, per_page)


@router.post("/import", summary="Importer le dictionnaire depuis un CSV ou XLSX", status_code=200)
async def import_dictionary(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    return await svc_import(db, content, file.filename or "")
