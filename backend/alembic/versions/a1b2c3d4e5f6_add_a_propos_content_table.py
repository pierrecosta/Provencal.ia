"""add_a_propos_content_table

Revision ID: a1b2c3d4e5f6
Revises: 9e668301b031
Create Date: 2026-04-16 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9e668301b031'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEMARCHE_INIT = (
    "Provencal.ia est un portail culturel dédié à la langue et à la culture provençales. "
    "Il propose un dictionnaire bilingue français–provençal (graphie mistralienne), un traducteur "
    "lexical mot-à-mot, un agenda des événements culturels régionaux, une bibliothèque "
    "d'histoires et de légendes, ainsi qu'un espace d'actualités sur la vie de la langue d'oc "
    "en Provence.\n\n"
    "Ce projet s'inscrit dans une démarche de valorisation et de transmission du patrimoine "
    "linguistique provençal, en utilisant des sources lexicographiques historiques du XIXème "
    "siècle numérisées et enrichies par une communauté de contributeurs bénévoles."
)

SOURCES_INIT = (
    "E. Garcin (1823) — Dictionnaire provençal-français, Grasse/Var\n"
    "Autran — Vocabulaire provençal, Alpes-Maritimes\n"
    "Achard (1785) — Dictionnaire de la Provence et du Comté-Venaissin, Alpes-Maritimes\n"
    "Honnorat (1846) — Dictionnaire provençal-français, Var\n"
    "Avril (1834) — Dictionnaire provençal-français, Marseille\n"
    "Pellas (1723) — Dictionnaire provençal-français, Marseille\n"
    "Xavier de Fourvières (1901) — Lou Pichot Trésor, Vallée du Rhône"
)


def upgrade() -> None:
    op.create_table(
        'a_propos_content',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bloc', sa.String(length=20), nullable=False),
        sa.Column('contenu', sa.Text(), nullable=False, server_default=''),
        sa.Column('locked_by', sa.Integer(), nullable=True),
        sa.Column('locked_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("bloc IN ('demarche', 'sources')", name='chk_bloc'),
        sa.ForeignKeyConstraint(['locked_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bloc'),
    )

    # Insérer les deux lignes initiales
    op.execute(
        sa.text(
            "INSERT INTO a_propos_content (bloc, contenu) VALUES "
            "(:bloc1, :contenu1), (:bloc2, :contenu2)"
        ).bindparams(
            bloc1='demarche',
            contenu1=DEMARCHE_INIT,
            bloc2='sources',
            contenu2=SOURCES_INIT,
        )
    )


def downgrade() -> None:
    op.drop_table('a_propos_content')
