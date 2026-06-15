import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import DATABASE_URL

db_url = DATABASE_URL
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

if "sqlite" in db_url:
    engine = create_engine(db_url, connect_args={"timeout": 10})
else:
    # Sync endpoints run in FastAPI's ~40-thread pool, and battle-card
    # generation holds a connection for the full ~20s Claude call. The default
    # pool (5 + 10 overflow = 15) starves under that, so size it to cover the
    # thread pool with headroom. pool_pre_ping survives Railway dropping idle
    # connections; recycle avoids stale ones. Env-tunable without a redeploy.
    engine = create_engine(
        db_url,
        connect_args={"connect_timeout": 10},
        pool_size=int(os.environ.get("DB_POOL_SIZE", "20")),
        max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "30")),
        pool_timeout=int(os.environ.get("DB_POOL_TIMEOUT", "30")),
        pool_recycle=1800,
        pool_pre_ping=True,
    )
    
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

get_session = get_db
