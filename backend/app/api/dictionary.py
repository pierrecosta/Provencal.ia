from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.dict_entry import DictEntry
from app.models.user import User
from app.schemas.dictionary import (
    DictEntryDetailOut,
    DictEntryResponse,
    DictEntryUpdate,
    ThemeCategoriesResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.services.dictionary import (
    delete_entry as svc_delete,
    get_entry_detail as svc_get_detail,
    import_dictionary as svc_import,
    list_dictionary as svc_list,
    list_themes as svc_themes,
    search_prov_to_fr as svc_search_prov,
    update_entry as svc_update,
)
from app.services.locking import acquire_lock, release_lock

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


# ── Endpoints CRUD par entrée ────────────────────────────────────────────────


@router.get("/{entry_id}", response_model=DictEntryDetailOut, summary="Détail complet d'une entrée")
async def get_entry_detail(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    entry = await svc_get_detail(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")
    return entry


@router.put("/{entry_id}", response_model=DictEntryDetailOut, summary="Modifier une entrée")
async def update_entry(
    entry_id: int,
    body: DictEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await svc_update(db, entry_id, body, current_user.id)
    await db.commit()
    return result


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Supprimer une entrée")
async def delete_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await svc_delete(db, entry_id, current_user.id)
    await db.commit()


@router.post("/{entry_id}/lock", summary="Acquérir le verrou sur une entrée")
async def lock_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await svc_get_detail(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")
    await acquire_lock(db, DictEntry, entry_id, current_user.id)
    await db.commit()
    return {"message": f"Verrou acquis sur l'entrée {entry_id}"}


@router.delete("/{entry_id}/lock", summary="Libérer le verrou sur une entrée")
async def unlock_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = await svc_get_detail(db, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrée introuvable")
    await release_lock(db, DictEntry, entry_id)
    await db.commit()
    return {"message": f"Verrou libéré sur l'entrée {entry_id}"}


@router.post("/{entry_id}/rollback", summary="Annuler la dernière modification d'une entrée")
async def rollback_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.edit_log import rollback_last_action

    result = await rollback_last_action(db, "dict_entries", entry_id, current_user.id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
