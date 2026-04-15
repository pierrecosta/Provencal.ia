"""
Script de maintenance — import des articles depuis articles_init.txt.

Usage (depuis backend/) :
    python -m scripts.seed_articles
"""

import asyncio
import datetime
import re
from pathlib import Path

from sqlalchemy import select

from app.core.database import async_session_maker, engine
from app.models.article import Article

INIT_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "sources" / "articles_init.txt"


def parse_articles(text: str) -> list[dict]:
    field_pattern = re.compile(r'(\w+)\s*=\s*"((?:[^"\\]|\\.|"")*)"', re.DOTALL)
    entries: list[dict] = []

    idx = 0
    while True:
        start = text.find("Article(", idx)
        if start == -1:
            break
        pos = start + len("Article(")
        in_quote = False
        while pos < len(text):
            ch = text[pos]
            if ch == '"':
                in_quote = not in_quote
            elif ch == ')' and not in_quote:
                break
            pos += 1

        block = text[start + len("Article("):pos]
        # Handle multi-line string concatenation
        block = block.replace('"\n', '" ')
        block = re.sub(r'"\s*"', '', block)

        fields = {k: v.strip() for k, v in field_pattern.findall(block)}
        if "titre" in fields:
            entries.append(fields)
        idx = pos + 1

    return entries


async def seed() -> None:
    try:
        raw = INIT_FILE.read_text(encoding="utf-8")
        entries = parse_articles(raw)

        imported = 0
        skipped = 0

        async with async_session_maker() as session:
            for entry in entries:
                date_pub = datetime.date.fromisoformat(entry["date_publication"])
                result = await session.execute(
                    select(Article).where(
                        Article.titre == entry["titre"],
                        Article.date_publication == date_pub,
                    )
                )
                if result.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                article = Article(
                    titre=entry["titre"],
                    description=entry.get("description"),
                    image_ref=entry.get("image_url"),
                    source_url=entry.get("source_url") or None,
                    date_publication=date_pub,
                    auteur=entry.get("auteur"),
                    categorie=entry.get("categorie"),
                )
                session.add(article)
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
