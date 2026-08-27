from fastapi import APIRouter, HTTPException, status

from app.schemas.visitor import VisitorCreate, VisitorOut, VisitorUpdate

router = APIRouter(prefix="/visitors", tags=["visitors"])

_NOT_IMPLEMENTED = "Not implemented yet \u2014 ships in Sprint 2"


@router.get("", response_model=list[VisitorOut])
async def list_visitors(skip: int = 0, limit: int = 50) -> list[VisitorOut]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post("", response_model=VisitorOut, status_code=status.HTTP_201_CREATED)
async def create_visitor(payload: VisitorCreate) -> VisitorOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/{visitor_id}", response_model=VisitorOut)
async def get_visitor(visitor_id: str) -> VisitorOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.patch("/{visitor_id}", response_model=VisitorOut)
async def update_visitor(visitor_id: str, payload: VisitorUpdate) -> VisitorOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.delete("/{visitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visitor(visitor_id: str) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
