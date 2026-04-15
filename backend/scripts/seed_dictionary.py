"""
Script de maintenance — import du dictionnaire depuis src_dict.csv.

Usage (depuis backend/) :
    python -m scripts.seed_dictionary
"""

import asyncio
from pathlib import Path

from sqlalchemy import and_, select

from app.core.database import async_session_maker, engine
from app.models.dict_entry import DictEntry
from app.models.dict_translation import DictTranslation

CSV_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "sources" / "src_dict.csv"

_TRAD_COLS: list[tuple[int, str, str]] = [
    (5, "canonique", ""),
    (6, "pre_mistralienne", "TradEG"),
    (7, "pre_mistralienne", "TradD"),
    (8, "pre_mistralienne", "TradA"),
    (9, "pre_mistralienne", "TradH"),
    (10, "pre_mistralienne", "TradAv"),
    (11, "pre_mistralienne", "TradP"),
    (12, "mistralienne", "TradX"),
]

_EXPECTED_COLS = 13


async def seed() -> None:
    import chardet

    try:
        raw = CSV_FILE.read_bytes()
        detected = chardet.detect(raw)
        encoding = detected.get("encoding") or "utf-8"
        try:
            text_data = raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            text_data = raw.decode("utf-8", errors="replace")

        lines = text_data.splitlines()
        rows = [line.split(";") for line in lines[1:] if line.strip()]

        imported_entries = 0
        imported_translations = 0
        skipped = 0
        errors = 0

        # Traitement par lots pour la performance
        BATCH_SIZE = 200
        batch_entries: list[DictEntry] = []
        batch_translations: list[DictTranslation] = []

        async with async_session_maker() as session:
            for line_no, row in enumerate(rows, start=2):
                if len(row) != _EXPECTED_COLS:
                    errors += 1
                    continue

                theme = row[0].strip() or None
                categorie = row[1].strip() or None
                mot_fr = row[2].strip()
                synonyme_fr = row[3].strip() or None
                description = row[4].strip() or None

                if not mot_fr:
                    continue

                trad_values = [row[col_idx].strip() for col_idx, _, _ in _TRAD_COLS]
                if not any(trad_values):
                    skipped += 1
                    continue

                # Vérifier doublon en base
                existing = await session.execute(
                    select(DictEntry).where(
                        and_(
                            DictEntry.mot_fr == mot_fr,
                            DictEntry.theme == theme,
                            DictEntry.categorie == categorie,
                        )
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                entry = DictEntry(
                    mot_fr=mot_fr[:200],
                    synonyme_fr=synonyme_fr[:200] if synonyme_fr else None,
                    description=description,
                    theme=theme[:100] if theme else None,
                    categorie=categorie[:100] if categorie else None,
                )
                session.add(entry)
                await session.flush()
                imported_entries += 1

                for col_idx, graphie, source in _TRAD_COLS:
                    val = row[col_idx].strip()
                    if not val:
                        continue
                    trans = DictTranslation(
                        entry_id=entry.id,
                        traduction=val[:500],
                        graphie=graphie or None,
                        source=source or None,
                    )
                    session.add(trans)
                    imported_translations += 1

                # Commit par lots pour éviter les timeouts
                if imported_entries % BATCH_SIZE == 0:
                    await session.commit()
                    print(f"  … {imported_entries} entrées importées")

            await session.commit()

        print(
            f"Importé : {imported_entries} entrées, {imported_translations} traductions "
            f"| Ignoré : {skipped} | Erreurs : {errors}"
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
