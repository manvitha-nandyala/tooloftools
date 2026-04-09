"""Add user identity columns for OIDC and nullable password.

Revision ID: 001_identity
Revises:
Create Date: 2026-02-10

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "001_identity"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(32), server_default="password", nullable=False),
    )
    op.add_column("users", sa.Column("external_sub", sa.String(512), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(255), nullable=True))

    if dialect == "sqlite":
        with op.batch_alter_table("users") as batch:
            batch.alter_column(
                "hashed_password",
                existing_type=sa.String(255),
                nullable=True,
            )
    else:
        op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=True)

    op.create_unique_constraint("uq_users_external_sub", "users", ["external_sub"])


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.drop_constraint("uq_users_external_sub", "users", type_="unique")
    op.drop_column("users", "email")
    op.drop_column("users", "external_sub")
    op.drop_column("users", "auth_provider")

    if dialect == "sqlite":
        with op.batch_alter_table("users") as batch:
            batch.alter_column(
                "hashed_password",
                existing_type=sa.String(255),
                nullable=False,
            )
    else:
        op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=False)
