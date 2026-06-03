from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import datasets, disclosures, dashboard, public, billing

app = FastAPI(title="TDCR API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tdcr.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(disclosures.router, prefix="/api/disclosures", tags=["disclosures"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(public.router, tags=["public"])


@app.get("/health")
async def health():
    return {"status": "ok"}
