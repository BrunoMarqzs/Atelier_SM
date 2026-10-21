"""Private web push subscriptions and durable delivery ledger.

Revision ID: 20261020_0011
Revises: 20260707_0010
"""
from alembic import op

revision = "20261020_0011"
down_revision = "20260707_0010"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE push_subscriptions (
            id BIGSERIAL PRIMARY KEY,
            admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            after_event_id INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE TABLE push_deliveries (
            subscription_id BIGINT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
            event_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
            attempts INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (subscription_id, event_id)
        )
    """)
    # Only the trusted backend DB role may access device capability URLs and keys.
    for table in ("push_subscriptions", "push_deliveries"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON {table} FROM PUBLIC")
        op.execute(f"""
            DO $$ BEGIN
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                    EXECUTE 'REVOKE ALL ON {table} FROM anon';
                END IF;
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                    EXECUTE 'REVOKE ALL ON {table} FROM authenticated';
                END IF;
            END $$;
        """)


def downgrade():
    op.drop_table("push_deliveries")
    op.drop_table("push_subscriptions")
