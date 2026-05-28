"""normalize enum values to lowercase

Revision ID: 20260528_0006
Revises: 20260521_0005
Create Date: 2026-05-28 11:50:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260528_0006"
down_revision: str | None = "20260521_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    _replace_enum_type(
        type_name="pricetype",
        values=("fixed", "quote"),
        columns=(("services", "price_type"),),
    )
    _replace_enum_type(
        type_name="availabilitystatus",
        values=("available", "blocked", "booked"),
        columns=(("availability_slots", "status"),),
    )
    _replace_enum_type(
        type_name="appointmentstatus",
        values=(
            "pending",
            "under_review",
            "quote_sent",
            "approved",
            "rejected",
            "in_progress",
            "completed",
            "cancelled",
        ),
        columns=(
            ("appointment_requests", "status"),
            ("status_history", "from_status"),
            ("status_history", "to_status"),
        ),
    )
    _replace_enum_type(
        type_name="storageprovider",
        values=("local", "cloudinary"),
        columns=(("request_images", "storage_provider"),),
    )


def downgrade() -> None:
    _replace_enum_type(
        type_name="pricetype",
        values=("FIXED", "QUOTE"),
        columns=(("services", "price_type"),),
        transform="upper",
    )
    _replace_enum_type(
        type_name="availabilitystatus",
        values=("AVAILABLE", "BLOCKED", "BOOKED"),
        columns=(("availability_slots", "status"),),
        transform="upper",
    )
    _replace_enum_type(
        type_name="appointmentstatus",
        values=(
            "PENDING",
            "UNDER_REVIEW",
            "QUOTE_SENT",
            "APPROVED",
            "REJECTED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
        ),
        columns=(
            ("appointment_requests", "status"),
            ("status_history", "from_status"),
            ("status_history", "to_status"),
        ),
        transform="upper",
    )
    _replace_enum_type(
        type_name="storageprovider",
        values=("LOCAL", "CLOUDINARY"),
        columns=(("request_images", "storage_provider"),),
        transform="upper",
    )


def _replace_enum_type(
    *,
    type_name: str,
    values: tuple[str, ...],
    columns: tuple[tuple[str, str], ...],
    transform: str = "lower",
) -> None:
    temp_type = f"{type_name}_new"
    quoted_values = ", ".join(f"'{value}'" for value in values)

    op.execute(f"CREATE TYPE {temp_type} AS ENUM ({quoted_values})")

    for table_name, column_name in columns:
        op.execute(
            f"""
            ALTER TABLE {table_name}
            ALTER COLUMN {column_name}
            TYPE {temp_type}
            USING {transform}({column_name}::text)::{temp_type}
            """
        )

    op.execute(f"DROP TYPE {type_name}")
    op.execute(f"ALTER TYPE {temp_type} RENAME TO {type_name}")
