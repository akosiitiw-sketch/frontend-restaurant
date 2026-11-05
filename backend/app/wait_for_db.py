import time
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.database import engine

for attempt in range(45):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("Database is ready.")
        break
    except SQLAlchemyError as exc:
        if attempt == 44:
            raise RuntimeError("Could not connect to MySQL. Check DATABASE_URL and Docker logs.") from exc
        time.sleep(2)
