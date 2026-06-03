from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.dataset import Dataset
from backend.schemas.dataset import DatasetCreate, DatasetUpdate, DatasetResponse, DatasetList
from backend.auth.clerk import get_current_user
from backend.services.hf_parser import HFParser

router = APIRouter()
hf_parser = HFParser()


@router.get("", response_model=DatasetList)
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(select(Dataset).where(Dataset.clerk_user_id == user_id))
    datasets = result.scalars().all()
    return DatasetList(datasets=list(datasets), total=len(datasets))


@router.post("", response_model=DatasetResponse, status_code=201)
async def create_dataset(
    payload: DatasetCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    extra: dict = {}
    if payload.source_type == "huggingface" and payload.hf_dataset_id:
        try:
            info = await hf_parser.fetch(payload.hf_dataset_id)
            extra = {
                "name": info.name,
                "sources_description": payload.sources_description or info.sources_description,
                "contains_personal_data": payload.contains_personal_data
                    if payload.contains_personal_data is not None else info.contains_personal_data,
                "license_type": payload.license_type or info.license_type,
                "contains_ip": payload.contains_ip
                    if payload.contains_ip is not None else info.contains_ip,
                "approximate_size": payload.approximate_size or info.approximate_size,
                "acquisition_method": payload.acquisition_method or info.acquisition_method,
            }
        except Exception:
            pass

    dataset = Dataset(
        company_slug=payload.company_slug,
        clerk_user_id=user_id,
        source_type=payload.source_type,
        hf_dataset_id=payload.hf_dataset_id,
        name=extra.get("name", payload.name),
        sources_description=extra.get("sources_description", payload.sources_description),
        contains_personal_data=extra.get("contains_personal_data", payload.contains_personal_data),
        license_type=extra.get("license_type", payload.license_type),
        contains_ip=extra.get("contains_ip", payload.contains_ip),
        approximate_size=extra.get("approximate_size", payload.approximate_size),
        acquisition_method=extra.get("acquisition_method", payload.acquisition_method),
        collection_period=payload.collection_period,
        modifications_description=payload.modifications_description,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.clerk_user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    return dataset


@router.patch("/{dataset_id}", response_model=DatasetResponse)
async def update_dataset(
    dataset_id: int,
    payload: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.clerk_user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(dataset, key, val)
    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.clerk_user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    await db.delete(dataset)
    await db.commit()
