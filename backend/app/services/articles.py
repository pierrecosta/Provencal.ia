from fastapi import HTTPException, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.schemas.pagination import paginate
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock


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


async def list_articles(
    db: AsyncSession,
    categorie: str | None,
    annee: int | None,
    mois: int | None,
    page: int,
    per_page: int,
) -> dict:
    query = select(Article).order_by(Article.date_publication.desc())

    if categorie:
        query = query.where(Article.categorie == categorie)
    if annee:
        query = query.where(extract("year", Article.date_publication) == annee)
    if mois:
        query = query.where(extract("month", Article.date_publication) == mois)

    return await paginate(db, query, page, per_page)


async def create_article(db: AsyncSession, data, user_id: int) -> Article:
    article = Article(
        titre=data.titre,
        description=data.description,
        image_ref=data.image_ref,
        source_url=data.source_url,
        date_publication=data.date_publication,
        auteur=data.auteur,
        categorie=data.categorie,
        created_by=user_id,
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
        user_id=user_id,
    )

    await db.commit()
    await db.refresh(article)
    return article


async def update_article(
    db: AsyncSession, article_id: int, data, user_id: int
) -> Article:
    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article introuvable",
        )

    await acquire_lock(db, Article, article_id, user_id)

    old_data = _to_dict(article)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    await log_action(
        db,
        table_name="articles",
        row_id=article_id,
        action="UPDATE",
        old_data=old_data,
        new_data=update_data,
        user_id=user_id,
    )

    await release_lock(db, Article, article_id)

    await db.commit()
    await db.refresh(article)
    return article


async def delete_article(
    db: AsyncSession, article_id: int, user_id: int
) -> dict:
    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article introuvable",
        )

    if is_locked(article, user_id):
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
        user_id=user_id,
    )

    await db.delete(article)
    await db.commit()
    return {"message": "Article supprimé"}


async def rollback_article(
    db: AsyncSession, article_id: int, user_id: int
) -> dict:
    result = await rollback_last_action(db, "articles", article_id, user_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
