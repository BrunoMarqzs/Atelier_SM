"""add payments table

Revision ID: 20260706_0008
Revises: 20260529_0007
Create Date: 2026-07-06
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260706_0008"
down_revision: str | None = "20260529_0007"
branch_labels = None
depends_on = None


payment_provider = postgresql.ENUM("mock", name="paymentprovider", create_type=False)
payment_method = postgresql.ENUM("pix", name="paymentmethod", create_type=False)
payment_status = postgresql.ENUM(
    "pending",
    "waiting_payment",
    "paid",
    "expired",
    "refunded",
    "failed",
    name="paymentstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    payment_provider.create(bind, checkfirst=True)
    payment_method.create(bind, checkfirst=True)
    payment_status.create(bind, checkfirst=True)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("provider", payment_provider, nullable=False),
        sa.Column("method", payment_method, nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("pix_qr_code", sa.Text(), nullable=True),
        sa.Column("pix_copy_paste", sa.Text(), nullable=True),
        sa.Column("external_payment_id", sa.String(length=120), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["order_id"], ["appointment_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id", name="uq_payments_order_id"),
    )
    op.create_index(op.f("ix_payments_id"), "payments", ["id"], unique=False)
    op.create_index(op.f("ix_payments_order_id"), "payments", ["order_id"], unique=False)
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.execute("ALTER TABLE payments ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_order_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_id"), table_name="payments")
    op.drop_table("payments")
    payment_status.drop(op.get_bind(), checkfirst=True)
    payment_method.drop(op.get_bind(), checkfirst=True)
    payment_provider.drop(op.get_bind(), checkfirst=True)
