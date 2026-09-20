from fastapi import APIRouter

from app.api.v1.journeys import router as journeys_router
from app.api.v1.services import router as services_router
from app.api.v1.stops import router as stops_router

router = APIRouter()
router.include_router(stops_router)
router.include_router(services_router)
router.include_router(journeys_router)
