from fastapi import APIRouter

from app.api.v1.stops import router as stops_router

router = APIRouter()
router.include_router(stops_router)
