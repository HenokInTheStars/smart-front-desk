import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import update
from app.db.models import Employee

async def f():
    async with AsyncSessionLocal() as s:
        await s.execute(update(Employee).values(availability_status=1))
        await s.commit()
    print('Done!')

asyncio.run(f())
