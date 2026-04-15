"""
Script de maintenance — import des entrées bibliothèque depuis histoire_init.txt.

Usage (depuis backend/) :
    python -m scripts.seed_library
"""

import asyncio
import re
from pathlib import Path

from sqlalchemy import select

from app.core.database import async_session_maker, engine
from app.models.library_entry import LibraryEntry

INIT_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "sources" / "histoire_init.txt"


def parse_entries(text: str) -> list[dict]:
    """Parse les blocs Histoire(...) du fichier init.

    Gère la concaténation implicite de chaînes multi-lignes Python.
    """
    field_pattern = re.compile(r'(\w+)\s*=\s*((?:"[^"]*"\s*)+)', re.MULTILINE)
    entries: list[dict] = []
    marker = "Histoire("

    idx = 0
    while True:
        start = text.find(marker, idx)
        if start == -1:
            break
        pos = start + len(marker)
        in_quote = False
        depth = 1
        while pos < len(text):
            ch = text[pos]
            if ch == '"':
                in_quote = not in_quote
            elif not in_quote:
                if ch == '(':
                    depth += 1
                elif ch == ')':
                    depth -= 1
                    if depth == 0:
                        break
            pos += 1

        block = text[start + len(marker):pos]
        fields: dict[str, str] = {}
        for key, raw_val in field_pattern.findall(block):
            fields[key] = "".join(re.findall(r'"([^"]*)"', raw_val))
        if "titre" in fields:
            entries.append(fields)
        idx = pos + 1

    return entries


async def seed() -> None:
    try:
        raw = INIT_FILE.read_text(encoding="utf-8")
        entries = parse_entries(raw)

        imported = 0
        skipped = 0

        async with async_session_maker() as session:
            for entry in entries:
                result = await session.execute(
                    select(LibraryEntry).where(LibraryEntry.titre == entry["titre"])
                )
                if result.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                typol = entry.get("typologie") or None
                # Normaliser la valeur de la typologie
                if typol and typol not in ("Histoire", "Légende"):
                    typol = None

                lib = LibraryEntry(
                    titre=entry["titre"][:200],
                    typologie=typol,
                    periode=(entry.get("periode") or "")[:200] or None,
                    description_courte=(entry.get("description_courte") or "")[:200] or None,
                    description_longue=entry.get("description_longue") or None,
                    source_url=(entry.get("source_url") or "")[:500] or None,
                    lang="fr",
                )
                session.add(lib)
                imported += 1

            await session.commit()

        print(f"Importé : {imported} | Ignoré (doublons) : {skipped} | Total : {imported + skipped}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
