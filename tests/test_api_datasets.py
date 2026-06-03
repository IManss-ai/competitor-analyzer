import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_dataset(client: AsyncClient):
    resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "Test Dataset",
        "sources_description": "Public web data",
        "contains_personal_data": False,
        "license_type": "CC-BY-4.0",
        "contains_ip": False,
        "approximate_size": "1GB",
        "acquisition_method": "Web scraping",
        "collection_period": "2020-2023",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Dataset"
    assert data["has_missing_fields"] is False


@pytest.mark.asyncio
async def test_list_datasets(client: AsyncClient):
    await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "DS1",
    })
    resp = await client.get("/api/datasets")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["datasets"]) == 1


@pytest.mark.asyncio
async def test_update_dataset(client: AsyncClient):
    create_resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "DS2",
    })
    ds_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/datasets/{ds_id}", json={"license_type": "MIT"})
    assert resp.status_code == 200
    assert resp.json()["license_type"] == "MIT"


@pytest.mark.asyncio
async def test_delete_dataset(client: AsyncClient):
    create_resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "DS3",
    })
    ds_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/datasets/{ds_id}")
    assert resp.status_code == 204
    # Verify gone
    get_resp = await client.get(f"/api/datasets/{ds_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_missing_fields_flag(client: AsyncClient):
    resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "Incomplete DS",
    })
    assert resp.status_code == 201
    assert resp.json()["has_missing_fields"] is True


@pytest.mark.asyncio
async def test_get_single_dataset(client: AsyncClient):
    create_resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "Single DS",
    })
    ds_id = create_resp.json()["id"]
    resp = await client.get(f"/api/datasets/{ds_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == ds_id
