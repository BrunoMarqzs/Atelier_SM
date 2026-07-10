"""announcement timestamps defaults

Revision ID: 20260707_0010
Revises: 20260707_0009
Create Date: 2026-07-07 09:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260707_0010"
down_revision: str | None = "20260707_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE announcements SET created_at = now() WHERE created_at IS NULL")
    op.execute("UPDATE announcements SET updated_at = now() WHERE updated_at IS NULL")
    op.alter_column(
        "announcements",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    op.alter_column(
        "announcements",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "announcements",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        nullable=False,
    )
    op.alter_column(
        "announcements",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        nullable=False,
    )
