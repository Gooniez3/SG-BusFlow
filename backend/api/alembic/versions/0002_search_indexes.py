"""Search and join indexes.

Revision ID: 0002_search_indexes
Revises: 0001_initial_schema
Create Date: 2026-09-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0002_search_indexes"
down_revision: Union[str, Sequence[str], None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bus_stops_name_trgm "
        "ON bus_stops USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bus_stops_road_name_trgm "
        "ON bus_stops USING gin (road_name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bus_stops_code_trgm "
        "ON bus_stops USING gin (code gin_trgm_ops)"
    )
    op.create_index(
        "ix_bus_route_stops_stop_route",
        "bus_route_stops",
        ["stop_id", "route_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_bus_route_stops_stop_route", table_name="bus_route_stops")
    op.execute("DROP INDEX IF EXISTS ix_bus_stops_code_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bus_stops_road_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_bus_stops_name_trgm")
