"""initial production schema

Revision ID: 20260519_0001
Revises:
Create Date: 2026-05-19 18:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260519_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


price_type = postgresql.ENUM("fixed", "quote", name="pricetype", create_type=False)
availability_status = postgresql.ENUM(
    "available", "blocked", "booked", name="availabilitystatus", create_type=False
)
appointment_status = postgresql.ENUM(
    "pending",
    "under_review",
    "quote_sent",
    "approved",
    "rejected",
    "in_progress",
    "completed",
    "cancelled",
    name="appointmentstatus",
    create_type=False,
)
storage_provider = postgresql.ENUM(
    "local", "cloudinary", name="storageprovider", create_type=False
)


def upgrade() -> None:
    price_type.create(op.get_bind(), checkfirst=True)
    availability_status.create(op.get_bind(), checkfirst=True)
    appointment_status.create(op.get_bind(), checkfirst=True)
    storage_provider.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_admin_users_email"),
    )
    op.create_index(op.f("ix_admin_users_email"), "admin_users", ["email"], unique=False)
    op.create_index(op.f("ix_admin_users_id"), "admin_users", ["id"], unique=False)

    op.create_table(
        "availability_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", availability_status, nullable=False),
        sa.Column("reason", sa.String(length=240), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("starts_at", "ends_at", name="uq_availability_slot_window"),
    )
    op.create_index(
        op.f("ix_availability_slots_ends_at"), "availability_slots", ["ends_at"], unique=False
    )
    op.create_index(op.f("ix_availability_slots_id"), "availability_slots", ["id"], unique=False)
    op.create_index(
        op.f("ix_availability_slots_starts_at"), "availability_slots", ["starts_at"], unique=False
    )
    op.create_index(
        "ix_availability_slots_status_starts_at",
        "availability_slots",
        ["status", "starts_at"],
        unique=False,
    )

    op.create_table(
        "client_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("normalized_phone", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_profiles_id"), "client_profiles", ["id"], unique=False)
    op.create_index(
        op.f("ix_client_profiles_normalized_phone"),
        "client_profiles",
        ["normalized_phone"],
        unique=False,
    )
    op.create_index(op.f("ix_client_profiles_phone"), "client_profiles", ["phone"], unique=False)

    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_type", price_type, nullable=False),
        sa.Column("fixed_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("highlighted", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_services_id"), "services", ["id"], unique=False)
    op.create_index(
        "ix_services_active_highlighted", "services", ["is_active", "highlighted"], unique=False
    )

    op.create_table(
        "appointment_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("slot_id", sa.Integer(), nullable=False),
        sa.Column("status", appointment_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column("estimated_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("public_code", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["client_id"], ["client_profiles.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.ForeignKeyConstraint(["slot_id"], ["availability_slots.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_code", name="uq_appointment_requests_public_code"),
        sa.UniqueConstraint("slot_id", name="uq_appointment_requests_slot_id"),
    )
    op.create_index(
        op.f("ix_appointment_requests_client_id"),
        "appointment_requests",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_requests_id"), "appointment_requests", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_appointment_requests_public_code"),
        "appointment_requests",
        ["public_code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_requests_service_id"),
        "appointment_requests",
        ["service_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_requests_slot_id"), "appointment_requests", ["slot_id"], unique=False
    )
    op.create_index(
        op.f("ix_appointment_requests_status"), "appointment_requests", ["status"], unique=False
    )

    op.create_table(
        "request_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("storage_provider", storage_provider, nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("public_id", sa.String(length=240), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["request_id"], ["appointment_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_request_images_id"), "request_images", ["id"], unique=False)
    op.create_index(
        op.f("ix_request_images_request_id"), "request_images", ["request_id"], unique=False
    )

    op.create_table(
        "status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("from_status", appointment_status, nullable=True),
        sa.Column("to_status", appointment_status, nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["request_id"], ["appointment_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_status_history_id"), "status_history", ["id"], unique=False)
    op.create_index(
        op.f("ix_status_history_request_id"), "status_history", ["request_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_status_history_request_id"), table_name="status_history")
    op.drop_index(op.f("ix_status_history_id"), table_name="status_history")
    op.drop_table("status_history")

    op.drop_index(op.f("ix_request_images_request_id"), table_name="request_images")
    op.drop_index(op.f("ix_request_images_id"), table_name="request_images")
    op.drop_table("request_images")

    op.drop_index(op.f("ix_appointment_requests_status"), table_name="appointment_requests")
    op.drop_index(op.f("ix_appointment_requests_slot_id"), table_name="appointment_requests")
    op.drop_index(op.f("ix_appointment_requests_service_id"), table_name="appointment_requests")
    op.drop_index(op.f("ix_appointment_requests_id"), table_name="appointment_requests")
    op.drop_index(op.f("ix_appointment_requests_client_id"), table_name="appointment_requests")
    op.drop_table("appointment_requests")

    op.drop_index("ix_services_active_highlighted", table_name="services")
    op.drop_index(op.f("ix_services_id"), table_name="services")
    op.drop_table("services")

    op.drop_index(op.f("ix_client_profiles_phone"), table_name="client_profiles")
    op.drop_index(op.f("ix_client_profiles_normalized_phone"), table_name="client_profiles")
    op.drop_index(op.f("ix_client_profiles_id"), table_name="client_profiles")
    op.drop_table("client_profiles")

    op.drop_index("ix_availability_slots_status_starts_at", table_name="availability_slots")
    op.drop_index(op.f("ix_availability_slots_starts_at"), table_name="availability_slots")
    op.drop_index(op.f("ix_availability_slots_id"), table_name="availability_slots")
    op.drop_index(op.f("ix_availability_slots_ends_at"), table_name="availability_slots")
    op.drop_table("availability_slots")

    op.drop_index(op.f("ix_admin_users_id"), table_name="admin_users")
    op.drop_index(op.f("ix_admin_users_email"), table_name="admin_users")
    op.drop_table("admin_users")

    storage_provider.drop(op.get_bind(), checkfirst=True)
    appointment_status.drop(op.get_bind(), checkfirst=True)
    availability_status.drop(op.get_bind(), checkfirst=True)
    price_type.drop(op.get_bind(), checkfirst=True)
