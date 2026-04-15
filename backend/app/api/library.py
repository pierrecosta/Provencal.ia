from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.library_entry import LibraryEntry
from app.models.user import User
from app.schemas.library import (
    LibraryCreate,
    LibraryDetailResponse,
    LibraryResponse,
    LibraryUpdate,
)
from app.schemas.pagination import PaginatedResponse
from app.services.locking import is_locked
from app.services.library import (
    create_library_entry as svc_create,
    delete_library_entry as svc_delete,
    get_library_entry as svc_get,
    list_library as svc_list,
    list_periodes as svc_periodes,
    rollback_library_entry as svc_rollback,
    update_library_entry as svc_update,
)

router = APIRouter(prefix="/library", tags=["Bibliothèque"])


def _to_response(row: LibraryEntry, current_user_id: int | None = None) -> LibraryResponse:
    return LibraryResponse(
        id=row.id,
        titre=row.titre,
        typologie=row.typologie,
        periode=row.periode,
        description_courte=row.description_courte,
        description_longue=row.description_longue,
        source_url=row.source_url,
        image_ref=row.image_ref,
        lang=row.lang,
        traduction_id=row.traduction_id,
        created_by=row.created_by,
        created_at=row.created_at,
        locked_by=row.locked_by,
        is_locked=is_locked(row, current_user_id) if current_user_id else row.locked_by is not None,
        has_translation=row.traduction_id is not None,
    )


@router.get("/periodes", response_model=list[str], summary="Liste des périodes disponibles")
async def list_periodes(db: AsyncSession = Depends(get_db)):
    return await svc_periodes(db)


@router.get("", response_model=PaginatedResponse[LibraryResponse], summary="Liste des entrées de la bibliothèque")
async def list_library(
    type: Optional[Literal["Histoire", "Légende"]] = Query(default=None),
    periode: Optional[str] = Query(default=None),
    lieu: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await svc_list(db, type, periode, lieu, page, per_page)
    result["items"] = [_to_response(e) for e in result["items"]]
    return result


@router.get("/{entry_id}", response_model=LibraryDetailResponse, summary="Détail d'une entrée")
async def get_library_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    entry, translation_lang = await svc_get(db, entry_id)
    resp = _to_response(entry)
    return LibraryDetailResponse(**resp.model_dump(), translation_lang=translation_lang)


@router.post("", response_model=LibraryResponse, status_code=201, summary="Créer une entrée")
async def create_library_entry(
    body: LibraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await svc_create(db, body, current_user.id)
    return _to_response(entry, current_user.id)


@router.put("/{entry_id}", response_model=LibraryResponse, summary="Modifier une entrée")
async def update_library_entry(
    entry_id: int,
    body: LibraryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await svc_update(db, entry_id, body, current_user.id)
    return _to_response(entry, current_user.id)


@router.delete("/{entry_id}", summary="Supprimer une entrée")
async def delete_library_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_delete(db, entry_id, current_user.id)


@router.post("/{entry_id}/rollback", summary="Annuler la dernière action sur une entrée")
async def rollback_library_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_rollback(db, entry_id, current_user.id)
