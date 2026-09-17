"""Initial PostGIS schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-17
"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS postgis"))

    op.create_table(
        "bus_stops",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geography(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeogFromText",
                name="geography",
            ),
            nullable=False,
        ),
        sa.Column("road_name", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bus_stops")),
        sa.UniqueConstraint("code", name=op.f("uq_bus_stops_code")),
    )
    op.create_index(
        "ix_bus_stops_location",
        "bus_stops",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_table(
        "bus_services",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("service_no", sa.String(length=8), nullable=False),
        sa.Column("operator", sa.String(length=16), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bus_services")),
        sa.UniqueConstraint("service_no", name=op.f("uq_bus_services_service_no")),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )

    op.create_table(
        "bus_routes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("direction", sa.SmallInteger(), nullable=False),
        sa.Column("origin_stop_id", sa.Uuid(), nullable=True),
        sa.Column("destination_stop_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("direction IN (1, 2)", name=op.f("ck_bus_routes_direction_valid")),
        sa.ForeignKeyConstraint(
            ["destination_stop_id"],
            ["bus_stops.id"],
            name=op.f("fk_bus_routes_destination_stop_id_bus_stops"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["origin_stop_id"],
            ["bus_stops.id"],
            name=op.f("fk_bus_routes_origin_stop_id_bus_stops"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["bus_services.id"],
            name=op.f("fk_bus_routes_service_id_bus_services"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bus_routes")),
        sa.UniqueConstraint(
            "service_id",
            "direction",
            name=op.f("uq_bus_routes_service_id"),
        ),
    )
    op.create_index(
        op.f("ix_bus_routes_service_id"),
        "bus_routes",
        ["service_id"],
        unique=False,
    )

    op.create_table(
        "bus_route_stops",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("route_id", sa.Uuid(), nullable=False),
        sa.Column("stop_id", sa.Uuid(), nullable=False),
        sa.Column("stop_sequence", sa.Integer(), nullable=False),
        sa.Column("distance_km", sa.Numeric(precision=8, scale=3), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["route_id"],
            ["bus_routes.id"],
            name=op.f("fk_bus_route_stops_route_id_bus_routes"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stop_id"],
            ["bus_stops.id"],
            name=op.f("fk_bus_route_stops_stop_id_bus_stops"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bus_route_stops")),
        sa.UniqueConstraint(
            "route_id",
            "stop_sequence",
            name=op.f("uq_bus_route_stops_route_id"),
        ),
    )
    op.create_index(
        op.f("ix_bus_route_stops_route_id"),
        "bus_route_stops",
        ["route_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bus_route_stops_stop_id"),
        "bus_route_stops",
        ["stop_id"],
        unique=False,
    )

    op.create_table(
        "buses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("vehicle_id", sa.String(length=32), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.Geography(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeogFromText",
                name="geography",
            ),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["bus_services.id"],
            name=op.f("fk_buses_service_id_bus_services"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_buses")),
        sa.UniqueConstraint("vehicle_id", name=op.f("uq_buses_vehicle_id")),
    )
    op.create_index(op.f("ix_buses_service_id"), "buses", ["service_id"], unique=False)

    op.create_table(
        "arrivals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("stop_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("bus_id", sa.Uuid(), nullable=True),
        sa.Column("estimated_arrival", sa.DateTime(timezone=True), nullable=False),
        sa.Column("visit_number", sa.Integer(), nullable=True),
        sa.Column("load", sa.String(length=8), nullable=True),
        sa.Column("feature", sa.String(length=16), nullable=True),
        sa.Column("type", sa.String(length=8), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["bus_id"],
            ["buses.id"],
            name=op.f("fk_arrivals_bus_id_buses"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["bus_services.id"],
            name=op.f("fk_arrivals_service_id_bus_services"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stop_id"],
            ["bus_stops.id"],
            name=op.f("fk_arrivals_stop_id_bus_stops"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_arrivals")),
    )
    op.create_index(op.f("ix_arrivals_service_id"), "arrivals", ["service_id"], unique=False)
    op.create_index(op.f("ix_arrivals_stop_id"), "arrivals", ["stop_id"], unique=False)

    op.create_table(
        "favorite_stops",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("stop_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["stop_id"],
            ["bus_stops.id"],
            name=op.f("fk_favorite_stops_stop_id_bus_stops"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_favorite_stops_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_favorite_stops")),
        sa.UniqueConstraint(
            "user_id",
            "stop_id",
            name=op.f("uq_favorite_stops_user_id"),
        ),
    )
    op.create_index(
        op.f("ix_favorite_stops_stop_id"),
        "favorite_stops",
        ["stop_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_favorite_stops_user_id"),
        "favorite_stops",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "favorite_services",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["bus_services.id"],
            name=op.f("fk_favorite_services_service_id_bus_services"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_favorite_services_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_favorite_services")),
        sa.UniqueConstraint(
            "user_id",
            "service_id",
            name=op.f("uq_favorite_services_user_id"),
        ),
    )
    op.create_index(
        op.f("ix_favorite_services_service_id"),
        "favorite_services",
        ["service_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_favorite_services_user_id"),
        "favorite_services",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_favorite_services_user_id"), table_name="favorite_services")
    op.drop_index(op.f("ix_favorite_services_service_id"), table_name="favorite_services")
    op.drop_table("favorite_services")
    op.drop_index(op.f("ix_favorite_stops_user_id"), table_name="favorite_stops")
    op.drop_index(op.f("ix_favorite_stops_stop_id"), table_name="favorite_stops")
    op.drop_table("favorite_stops")
    op.drop_index(op.f("ix_arrivals_stop_id"), table_name="arrivals")
    op.drop_index(op.f("ix_arrivals_service_id"), table_name="arrivals")
    op.drop_table("arrivals")
    op.drop_index(op.f("ix_buses_service_id"), table_name="buses")
    op.drop_table("buses")
    op.drop_index(op.f("ix_bus_route_stops_stop_id"), table_name="bus_route_stops")
    op.drop_index(op.f("ix_bus_route_stops_route_id"), table_name="bus_route_stops")
    op.drop_table("bus_route_stops")
    op.drop_index(op.f("ix_bus_routes_service_id"), table_name="bus_routes")
    op.drop_table("bus_routes")
    op.drop_table("users")
    op.drop_table("bus_services")
    op.drop_index("ix_bus_stops_location", table_name="bus_stops")
    op.drop_table("bus_stops")
    op.execute(sa.text("DROP EXTENSION IF EXISTS postgis"))
