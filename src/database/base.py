import sqlalchemy as db
import os

# Get database URL from environment variable or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://root:root@localhost:5432/plot_twister"
)

engine = db.create_engine(DATABASE_URL)
