import pytest
from httpx import AsyncClient


async def _create_full_dataset(client: AsyncClient, name: str = "Full DS") -> int:
    resp = await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": name,
        "sources_description": "Test data source",
        "contains_personal_data": False,
        "license_type": "MIT",
        "contains_ip": False,
        "approximate_size": "100MB",
        "acquisition_method": "manual collection",
        "collection_period": "2024",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_generate_disclosure(client: AsyncClient):
    ds_id = await _create_full_dataset(client)
    resp = await client.post("/api/disclosures/generate", json={
        "company_name": "Acme Corp",
        "company_slug": "acme",
        "dataset_ids": [ds_id],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "html_content" in data
    assert "version_hash" in data
    assert data["published_at"] is None
    assert "Training Data Disclosure" in data["html_content"]


@pytest.mark.asyncio
async def test_list_disclosures(client: AsyncClient):
    ds_id = await _create_full_dataset(client)
    await client.post("/api/disclosures/generate", json={
        "company_name": "Acme Corp",
        "company_slug": "acme",
        "dataset_ids": [ds_id],
    })
    resp = await client.get("/api/disclosures")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_publish_disclosure(client: AsyncClient):
    ds_id = await _create_full_dataset(client)
    gen_resp = await client.post("/api/disclosures/generate", json={
        "company_name": "Acme Corp",
        "company_slug": "acme",
        "dataset_ids": [ds_id],
    })
    disc_id = gen_resp.json()["id"]
    resp = await client.post(f"/api/disclosures/{disc_id}/publish")
    assert resp.status_code == 200
    assert resp.json()["published_at"] is not None


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient):
    await _create_full_dataset(client, "DS1")
    await _create_full_dataset(client, "DS2")
    resp = await client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_datasets"] == 2
    assert data["compliant_datasets"] == 2
    assert data["compliance_score"] == 1.0


@pytest.mark.asyncio
async def test_dashboard_stats_partial_compliance(client: AsyncClient):
    await _create_full_dataset(client, "Complete DS")
    # Incomplete dataset
    await client.post("/api/datasets", json={
        "company_slug": "acme",
        "source_type": "manual",
        "name": "Incomplete DS",
    })
    resp = await client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_datasets"] == 2
    assert data["compliant_datasets"] == 1
    assert data["non_compliant_datasets"] == 1
    assert data["compliance_score"] == 0.5


@pytest.mark.asyncio
async def test_generate_disclosure_no_datasets(client: AsyncClient):
    resp = await client.post("/api/disclosures/generate", json={
        "company_name": "Acme Corp",
        "company_slug": "acme",
        "dataset_ids": [9999],
    })
    assert resp.status_code == 404
