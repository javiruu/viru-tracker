"""add idempotency records

Revision ID: 0005_add_idempotency_records
Revises: 0004_account_system_redesign
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_idempotency_records"
down_revision = "0004_account_system_redesign"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "idempotency_record",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("endpoint", sa.String(length=200), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_status", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id", "endpoint", "idempotency_key", name="uq_idempotency_user_endpoint_key"),
    )
    op.create_index("ix_idempotency_record_user_id", "idempotency_record", ["user_id"])
    op.create_index("ix_idempotency_record_endpoint", "idempotency_record", ["endpoint"])
    op.create_index("ix_idempotency_record_idempotency_key", "idempotency_record", ["idempotency_key"])


def downgrade() -> None:
    op.drop_index("ix_idempotency_record_idempotency_key", table_name="idempotency_record")
    op.drop_index("ix_idempotency_record_endpoint", table_name="idempotency_record")
    op.drop_index("ix_idempotency_record_user_id", table_name="idempotency_record")
    op.drop_table("idempotency_record")
