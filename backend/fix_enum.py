import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def fix_enum():
    async with AsyncSessionLocal() as session:
        try:
            # Create the enum type
            await session.execute(text("CREATE TYPE user_role_enum AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RECEPTION', 'HOST', 'OTHER');"))
            # Alter the column
            await session.execute(text("ALTER TABLE users ALTER COLUMN role TYPE user_role_enum USING role::user_role_enum;"))
            await session.commit()
            print('Enum type created and column altered.')
        except Exception as e:
            print(f'Error: {e}')

asyncio.run(fix_enum())
