"""add public request code

Revision ID: 20260521_0002
Revises: 20260519_0003
Create Date: 2026-05-21 08:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260521_0002"
down_revision: str | None = "20260519_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "appointment_requests",
        sa.Column("public_code", sa.String(length=16), nullable=True),
    )
    op.execute(
        """
        UPDATE appointment_requests
        SET public_code = UPPER(SUBSTRING(MD5(id::text || created_at::text || random()::text), 1, 10))
        WHERE public_code IS NULL
        """
    )
    op.alter_column("appointment_requests", "public_code", nullable=False)
    op.create_index(
        op.f("ix_appointment_requests_public_code"),
        "appointment_requests",
        ["public_code"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_appointment_requests_public_code",
        "appointment_requests",
        ["public_code"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_appointment_requests_public_code",
        "appointment_requests",
        type_="unique",
    )
    op.drop_index(op.f("ix_appointment_requests_public_code"), table_name="appointment_requests")
    op.drop_column("appointment_requests", "public_code")
