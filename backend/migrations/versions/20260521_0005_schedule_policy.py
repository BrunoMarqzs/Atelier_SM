"""add configurable schedule policy

Revision ID: 20260521_0005
Revises: 20260521_0004
Create Date: 2026-05-21 11:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260521_0005"
down_revision: str | None = "20260521_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_WEEKLY_HOURS = {
    "0": [8, 9, 10, 14, 15, 16, 17],
    "1": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "2": [8, 9, 10, 14, 15, 16, 17],
    "3": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "4": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "5": [14, 15, 16],
    "6": [],
}


def upgrade() -> None:
    op.create_table(
        "schedule_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("opening_time", sa.String(length=5), nullable=False),
        sa.Column("closing_time", sa.String(length=5), nullable=False),
        sa.Column("lunch_block_hours", sa.JSON(), nullable=False),
        sa.Column("weekly_hours", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "schedule_exceptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exception_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("hours", sa.JSON(), nullable=True),
        sa.Column("reason", sa.String(length=240), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exception_date", name="uq_schedule_exception_date"),
    )
    op.create_index(op.f("ix_schedule_exceptions_exception_date"), "schedule_exceptions", ["exception_date"], unique=False)
    op.create_index(op.f("ix_schedule_exceptions_id"), "schedule_exceptions", ["id"], unique=False)
    op.bulk_insert(
        sa.table(
            "schedule_configs",
            sa.column("id", sa.Integer()),
            sa.column("opening_time", sa.String()),
            sa.column("closing_time", sa.String()),
            sa.column("lunch_block_hours", sa.JSON()),
            sa.column("weekly_hours", sa.JSON()),
        ),
        [
            {
                "id": 1,
                "opening_time": "08:00",
                "closing_time": "19:00",
                "lunch_block_hours": [11, 12, 13],
                "weekly_hours": DEFAULT_WEEKLY_HOURS,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_schedule_exceptions_id"), table_name="schedule_exceptions")
    op.drop_index(op.f("ix_schedule_exceptions_exception_date"), table_name="schedule_exceptions")
    op.drop_table("schedule_exceptions")
    op.drop_table("schedule_configs")

