from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate
from app.schemas.pagination import PaginatedResponse
from app.services.articles import (
    create_article as svc_create,
    delete_article as svc_delete,
    list_articles as svc_list,
    rollback_article as svc_rollback,
    update_article as svc_update,
)
from app.services.locking import is_locked

router = APIRouter(prefix="/articles", tags=["Actualités"])


def _to_response(row: Article, current_user_id: int | None = None) -> ArticleResponse:
    return ArticleResponse(
        id=row.id,
        titre=row.titre,
        description=row.description,
        image_ref=row.image_ref,
        source_url=row.source_url,
        date_publication=row.date_publication,
        auteur=row.auteur,
        categorie=row.categorie,
        created_by=row.created_by,
        created_at=row.created_at,
        locked_by=row.locked_by,
        is_locked=is_locked(row, current_user_id) if current_user_id else row.locked_by is not None,
    )


@router.get("", response_model=PaginatedResponse[ArticleResponse], summary="Liste des articles")
async def list_articles(
    categorie: Optional[str] = Query(default=None),
    annee: Optional[int] = Query(default=None),
    mois: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await svc_list(db, categorie, annee, mois, page, per_page)
    result["items"] = [_to_response(a) for a in result["items"]]
    return result


@router.post("", response_model=ArticleResponse, status_code=201, summary="Créer un article")
async def create_article(
    body: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await svc_create(db, body, current_user.id)
    return _to_response(article, current_user.id)


@router.put("/{article_id}", response_model=ArticleResponse, summary="Modifier un article")
async def update_article(
    article_id: int,
    body: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await svc_update(db, article_id, body, current_user.id)
    return _to_response(article, current_user.id)


@router.delete("/{article_id}", summary="Supprimer un article")
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_delete(db, article_id, current_user.id)


@router.post("/{article_id}/rollback", summary="Annuler la dernière action sur un article")
async def rollback_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await svc_rollback(db, article_id, current_user.id)
