from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate
from app.schemas.pagination import PaginatedResponse, paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock

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


def _to_dict(row: Article) -> dict:
    return {
        "titre": row.titre,
        "description": row.description,
        "image_ref": row.image_ref,
        "source_url": row.source_url,
        "date_publication": str(row.date_publication),
        "auteur": row.auteur,
        "categorie": row.categorie,
    }


@router.get(
    "",
    response_model=PaginatedResponse[ArticleResponse],
    summary="Liste des articles",
)
async def list_articles(
    categorie: Optional[str] = Query(default=None),
    annee: Optional[int] = Query(default=None),
    mois: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Article).order_by(Article.date_publication.desc())

    if categorie:
        query = query.where(Article.categorie == categorie)
    if annee:
        query = query.where(extract("year", Article.date_publication) == annee)
    if mois:
        query = query.where(extract("month", Article.date_publication) == mois)

    result = await paginate(db, query, page, per_page)
    result["items"] = [_to_response(a) for a in result["items"]]
    return result


@router.post(
    "",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un article",
)
async def create_article(
    body: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = Article(
        titre=body.titre,
        description=body.description,
        image_ref=body.image_ref,
        source_url=body.source_url,
        date_publication=body.date_publication,
        auteur=body.auteur,
        categorie=body.categorie,
        created_by=current_user.id,
    )
    db.add(article)
    await db.flush()

    await log_action(
        db,
        table_name="articles",
        row_id=article.id,
        action="INSERT",
        old_data=None,
        new_data=_to_dict(article),
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(article)
    return _to_response(article, current_user.id)


@router.put("/{article_id}", response_model=ArticleResponse, summary="Modifier un article")
async def update_article(
    article_id: int,
    body: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article introuvable",
        )

    await acquire_lock(db, Article, article_id, current_user.id)

    old_data = _to_dict(article)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    await log_action(
        db,
        table_name="articles",
        row_id=article_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=current_user.id,
    )

    await release_lock(db, Article, article_id)

    await db.commit()
    await db.refresh(article)
    return _to_response(article, current_user.id)


@router.delete("/{article_id}", summary="Supprimer un article")
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article introuvable",
        )

    if is_locked(article, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élément verrouillé par un autre contributeur",
        )

    old_data = _to_dict(article)

    await log_action(
        db,
        table_name="articles",
        row_id=article_id,
        action="DELETE",
        old_data=old_data,
        new_data=None,
        user_id=current_user.id,
    )

    await db.delete(article)
    await db.commit()
    return {"message": "Article supprimé"}


@router.post("/{article_id}/rollback", summary="Annuler la dernière action sur un article")
async def rollback_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await rollback_last_action(db, "articles", article_id, current_user.id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
