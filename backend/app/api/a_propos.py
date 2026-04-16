from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.a_propos import AProposContent
from app.models.user import User
from app.schemas.a_propos import AProposBlocOut, AProposBlocUpdate, AProposOut
from app.services.edit_log import log_action, rollback_last_action
from app.services.locking import acquire_lock, is_locked, release_lock, _utcnow

router = APIRouter(prefix="/a-propos", tags=["À propos"])

VALID_BLOCS = {"demarche", "sources"}


async def _get_bloc(db: AsyncSession, bloc: str) -> AProposContent:
    result = await db.execute(
        select(AProposContent).where(AProposContent.bloc == bloc)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bloc '{bloc}' introuvable",
        )
    return row


def _check_valid_bloc(bloc: str) -> None:
    if bloc not in VALID_BLOCS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bloc '{bloc}' invalide. Valeurs acceptées : demarche, sources",
        )


@router.get("", response_model=AProposOut, summary="Contenu de la page À propos")
async def get_a_propos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AProposContent))
    rows = {r.bloc: r for r in result.scalars().all()}

    # Contributeurs depuis la table users
    users_result = await db.execute(select(User.pseudo).order_by(User.pseudo))
    contributors = [row[0] for row in users_result.all()]

    demarche_row = rows.get("demarche")
    sources_row = rows.get("sources")

    if demarche_row is None or sources_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Données À propos manquantes en base",
        )

    return AProposOut(
        demarche=AProposBlocOut.model_validate(demarche_row),
        sources=AProposBlocOut.model_validate(sources_row),
        contributors=contributors,
    )


@router.put("/{bloc}", response_model=AProposBlocOut, summary="Modifier un bloc")
async def update_bloc(
    bloc: str,
    body: AProposBlocUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_valid_bloc(bloc)
    row = await _get_bloc(db, bloc)

    # Vérifier le verrou
    if is_locked(row, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Bloc verrouillé par un autre contributeur",
        )

    old_contenu = row.contenu

    await db.execute(
        update(AProposContent)
        .where(AProposContent.bloc == bloc)
        .values(
            contenu=body.contenu,
            updated_by=current_user.id,
            updated_at=_utcnow(),
            locked_by=None,
            locked_at=None,
        )
    )
    await db.flush()

    await log_action(
        db,
        table_name="a_propos_content",
        row_id=row.id,
        action="UPDATE",
        old_data={"contenu": old_contenu},
        new_data={"contenu": body.contenu},
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(row)
    return AProposBlocOut.model_validate(row)


@router.post("/{bloc}/lock", summary="Acquérir le verrou sur un bloc")
async def lock_bloc(
    bloc: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_valid_bloc(bloc)
    row = await _get_bloc(db, bloc)
    await acquire_lock(db, AProposContent, row.id, current_user.id)
    await db.commit()
    return {"message": f"Verrou acquis sur le bloc '{bloc}'"}


@router.delete("/{bloc}/lock", summary="Libérer le verrou sur un bloc")
async def unlock_bloc(
    bloc: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_valid_bloc(bloc)
    row = await _get_bloc(db, bloc)
    await release_lock(db, AProposContent, row.id)
    await db.commit()
    return {"message": f"Verrou libéré sur le bloc '{bloc}'"}


@router.post("/{bloc}/rollback", summary="Annuler la dernière modification d'un bloc")
async def rollback_bloc(
    bloc: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_valid_bloc(bloc)
    row = await _get_bloc(db, bloc)
    result = await rollback_last_action(
        db, "a_propos_content", row.id, current_user.id
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune action à annuler",
        )
    await db.commit()
    return result
