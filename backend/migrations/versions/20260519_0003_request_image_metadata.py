"""add request image metadata

Revision ID: 20260519_0003
Revises: 20260519_0002
Create Date: 2026-05-19 19:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260519_0003"
down_revision: str | None = "20260519_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "request_images", sa.Column("thumbnail_url", sa.String(length=500), nullable=True)
    )
    op.add_column(
        "request_images",
        sa.Column("original_filename", sa.String(length=240), nullable=True),
    )
    op.add_column(
        "request_images",
        sa.Column("mime_type", sa.String(length=80), nullable=False, server_default="image/jpeg"),
    )
    op.add_column(
        "request_images",
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("request_images", "mime_type", server_default=None)
    op.alter_column("request_images", "size_bytes", server_default=None)


def downgrade() -> None:
    op.drop_column("request_images", "size_bytes")
    op.drop_column("request_images", "mime_type")
    op.drop_column("request_images", "original_filename")
    op.drop_column("request_images", "thumbnail_url")
