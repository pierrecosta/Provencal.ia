from sqlalchemy import delete as sql_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edit_log import EditLog


async def log_action(
    db: AsyncSession,
    table_name: str,
    row_id: int,
    action: str,
    old_data: dict | None,
    new_data: dict | None,
    user_id: int | None,
) -> EditLog:
    entry = EditLog(
        table_name=table_name,
        row_id=row_id,
        action=action,
        old_data=old_data,
        new_data=new_data,
        done_by=user_id,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_last_log(
    db: AsyncSession, table_name: str, row_id: int
) -> EditLog | None:
    result = await db.execute(
        select(EditLog)
        .where(EditLog.table_name == table_name, EditLog.row_id == row_id)
        .order_by(EditLog.done_at.desc(), EditLog.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _get_model_class(table_name: str):
    """Retourne la classe SQLAlchemy correspondant au nom de table."""
    from app.models.saying import Saying
    from app.models.agenda_event import AgendaEvent
    from app.models.article import Article
    from app.models.library_entry import LibraryEntry
    from app.models.a_propos import AProposContent

    mapping = {
        "sayings": Saying,
        "agenda_events": AgendaEvent,
        "articles": Article,
        "library_entries": LibraryEntry,
        "a_propos_content": AProposContent,
    }
    return mapping.get(table_name)


async def rollback_last_action(
    db: AsyncSession,
    table_name: str,
    row_id: int,
    current_user_id: int,
) -> dict:
    """Annule la dernière action enregistrée dans edit_log pour (table_name, row_id)."""
    log_entry = await get_last_log(db, table_name, row_id)

    if log_entry is None:
        return None  # 404 géré dans le routeur

    model_class = _get_model_class(table_name)
    if model_class is None:
        return None

    action = log_entry.action

    if action == "INSERT":
        # Annuler un INSERT → supprimer la ligne
        row = await db.get(model_class, row_id)
        if row is not None:
            await db.delete(row)

    elif action == "UPDATE":
        # Annuler un UPDATE → restaurer old_data
        row = await db.get(model_class, row_id)
        if row is not None and log_entry.old_data:
            for field, value in log_entry.old_data.items():
                if hasattr(row, field):
                    setattr(row, field, value)

    elif action == "DELETE":
        # Annuler un DELETE → recréer la ligne avec old_data
        if log_entry.old_data:
            new_row = model_class(id=row_id, **{
                k: v for k, v in log_entry.old_data.items()
                if hasattr(model_class, k)
            })
            db.add(new_row)

    # Supprimer l'entrée de log (usage unique)
    await db.execute(
        sql_delete(EditLog).where(EditLog.id == log_entry.id)
    )
    await db.flush()

    return {"message": f"Rollback effectué ({action} sur {table_name}:{row_id})"}

