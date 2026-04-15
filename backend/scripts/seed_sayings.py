"""
Script de maintenance — import des dictons depuis sayings_init.txt.

Usage (depuis backend/) :
    python -m scripts.seed_sayings
"""

import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import select

from app.core.database import async_session_maker, engine
from app.models.saying import Saying

INIT_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "sources" / "sayings_init.txt"
if not INIT_FILE.exists():
    INIT_FILE = Path(__file__).resolve().parent.parent / "sayings_init.txt"


def parse_sayings(text: str) -> list[dict]:
    field_pattern = re.compile(r'(\w+)\s*=\s*"([^"]*)"')
    entries: list[dict] = []

    idx = 0
    while True:
        start = text.find("Saying(", idx)
        if start == -1:
            break
        # Find matching ')' skipping content inside double quotes
        pos = start + len("Saying(")
        in_quote = False
        while pos < len(text):
            ch = text[pos]
            if ch == '"':
                in_quote = not in_quote
            elif ch == ')' and not in_quote:
                break
            pos += 1

        block = text[start + len("Saying("):pos]
        fields = {k: v for k, v in field_pattern.findall(block)}
        if "terme_provencal" in fields:
            entries.append(fields)
        idx = pos + 1

    return entries


async def seed() -> None:
    try:
        raw = INIT_FILE.read_text(encoding="utf-8")
        entries = parse_sayings(raw)

        imported = 0
        skipped = 0

        async with async_session_maker() as session:
            for entry in entries:
                result = await session.execute(
                    select(Saying).where(
                        Saying.terme_provencal == entry["terme_provencal"]
                    )
                )
                if result.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                saying = Saying(
                    terme_provencal=entry["terme_provencal"],
                    localite_origine=entry["localite_origine"],
                    traduction_sens_fr=entry["traduction_sens_fr"],
                    type=entry.get("type"),
                    contexte=entry.get("contexte"),
                    source=entry.get("source"),
                )
                session.add(saying)
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
