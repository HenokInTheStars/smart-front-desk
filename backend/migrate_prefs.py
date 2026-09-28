import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}' NOT NULL;"))
            print("Migration successful")
        except Exception as e:
            print("Migration failed or already applied:", e)

if __name__ == "__main__":
    asyncio.run(main())
