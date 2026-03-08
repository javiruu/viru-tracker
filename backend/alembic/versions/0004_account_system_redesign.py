"""account system redesign

Revision ID: 0004_account_system_redesign
Revises: 0003_add_user_notes
Create Date: 2026-02-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_account_system_redesign"
down_revision = "0003_add_user_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profile",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="activa"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_profile_user_id", "user_profile", ["user_id"], unique=True)

    op.create_table(
        "user_session",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("device", sa.String(length=200), nullable=False, server_default="Este dispositivo"),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_session_user_id", "user_session", ["user_id"])

    op.create_table(
        "user_preference_appearance",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("theme", sa.String(length=16), nullable=False, server_default="system"),
        sa.Column("density", sa.String(length=16), nullable=False, server_default="comfortable"),
        sa.Column("reduce_motion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("high_contrast", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_preference_appearance_user_id", "user_preference_appearance", ["user_id"], unique=True)

    op.create_table(
        "user_preference_region",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=False, server_default="es"),
        sa.Column("region", sa.String(length=8), nullable=False, server_default="ES"),
        sa.Column("time_format", sa.String(length=8), nullable=False, server_default="24h"),
        sa.Column("decimal_separator", sa.String(length=2), nullable=False, server_default=","),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="EUR"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_preference_region_user_id", "user_preference_region", ["user_id"], unique=True)

    op.create_table(
        "security_activity",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_security_activity_user_id", "security_activity", ["user_id"])

    op.create_table(
        "support_feedback",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("feedback_type", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("support_feedback")
    op.drop_index("ix_security_activity_user_id", table_name="security_activity")
    op.drop_table("security_activity")
    op.drop_index("ix_user_preference_region_user_id", table_name="user_preference_region")
    op.drop_table("user_preference_region")
    op.drop_index("ix_user_preference_appearance_user_id", table_name="user_preference_appearance")
    op.drop_table("user_preference_appearance")
    op.drop_index("ix_user_session_user_id", table_name="user_session")
    op.drop_table("user_session")
    op.drop_index("ix_user_profile_user_id", table_name="user_profile")
    op.drop_table("user_profile")
