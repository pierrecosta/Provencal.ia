"""
Script de maintenance — import des événements depuis agenda_init.txt.

Usage (depuis backend/) :
    python -m scripts.seed_events
"""

import asyncio
import datetime
import re
from pathlib import Path

from sqlalchemy import and_, select

from app.core.database import async_session_maker, engine
from app.models.agenda_event import AgendaEvent

INIT_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "sources" / "agenda_init.txt"


def parse_events(text: str) -> list[dict]:
    """Parse les blocs EvenementAgenda(...) du fichier init.

    Gère la concaténation implicite de chaînes multi-lignes Python.
    """
    # Capture: nom_champ = "..." suivi optionnellement d'autres "..." (continuations)
    field_pattern = re.compile(r'(\w+)\s*=\s*((?:"[^"]*"\s*)+)', re.MULTILINE)
    entries: list[dict] = []
    marker = "EvenementAgenda("

    idx = 0
    while True:
        start = text.find(marker, idx)
        if start == -1:
            break
        pos = start + len(marker)
        in_quote = False
        while pos < len(text):
            ch = text[pos]
            if ch == '"':
                in_quote = not in_quote
            elif ch == ')' and not in_quote:
                break
            pos += 1

        block = text[start + len(marker):pos]
        fields: dict[str, str] = {}
        for key, raw_val in field_pattern.findall(block):
            # Joindre toutes les parties de la concaténation
            fields[key] = "".join(re.findall(r'"([^"]*)"', raw_val))
        if "titre" in fields:
            entries.append(fields)
        idx = pos + 1

    return entries


async def seed() -> None:
    try:
        raw = INIT_FILE.read_text(encoding="utf-8")
        entries = parse_events(raw)

        imported = 0
        skipped = 0

        async with async_session_maker() as session:
            for entry in entries:
                date_debut = datetime.date.fromisoformat(entry["date_debut"])
                result = await session.execute(
                    select(AgendaEvent).where(
                        and_(
                            AgendaEvent.titre == entry["titre"],
                            AgendaEvent.date_debut == date_debut,
                        )
                    )
                )
                if result.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                event = AgendaEvent(
                    titre=entry["titre"],
                    date_debut=date_debut,
                    date_fin=datetime.date.fromisoformat(entry["date_fin"]),
                    lieu=entry.get("lieu") or None,
                    description=entry.get("description") or None,
                    lien_externe=entry.get("lien_externe") or None,
                )
                session.add(event)
                imported += 1

            await session.commit()

        total = imported + skipped
        print(f"Importé : {imported} | Ignoré (doublons) : {skipped} | Total : {total}")
    finally:
        await engine.dispose()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
