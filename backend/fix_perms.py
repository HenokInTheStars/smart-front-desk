import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).filter(User.role.in_(['ADMIN', 'RECEPTION'])))
        users = res.scalars().all()
        for u in users:
            perms = u.permissions or ''
            if '21_reassign_guests' not in perms:
                u.permissions = perms + (',' if perms else '') + '21_reassign_guests'
        await db.commit()
        print("Updated permissions!")

asyncio.run(run())
