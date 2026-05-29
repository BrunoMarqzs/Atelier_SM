"""Persist request image bytes for durable production previews.

Revision ID: 20260529_0007
Revises: 20260528_0006
Create Date: 2026-05-29
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260529_0007"
down_revision: str | None = "20260528_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("request_images", sa.Column("content_bytes", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("request_images", "content_bytes")
