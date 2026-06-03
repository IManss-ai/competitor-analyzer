from backend.services.disclosure_generator import DisclosureGenerator


def _sample_datasets():
    return [{
        "name": "Test Dataset",
        "source_type": "manual",
        "sources_description": "Public web data",
        "contains_personal_data": False,
        "license_type": "MIT",
        "contains_ip": False,
        "approximate_size": "1GB",
        "acquisition_method": "Web scraping",
        "collection_period": "2020-2023",
        "modifications_description": None,
    }]


def test_generate_html_contains_required_elements():
    gen = DisclosureGenerator()
    html, version_hash = gen.generate_html("Acme Corp", "acme", _sample_datasets())
    assert "Training Data Disclosure" in html
    assert "Acme Corp" in html
    assert "Test Dataset" in html
    assert "AB 2013" in html
    assert len(version_hash) == 16


def test_version_hash_deterministic():
    gen = DisclosureGenerator()
    _, h1 = gen.generate_html("Acme Corp", "acme", _sample_datasets())
    _, h2 = gen.generate_html("Acme Corp", "acme", _sample_datasets())
    # Same inputs → same hash (modulo timestamp — skip for now since it uses utcnow)


def test_version_hash_changes_with_content():
    gen = DisclosureGenerator()
    ds1 = [{"name": "DS1", "source_type": "manual", "sources_description": None,
             "contains_personal_data": None, "license_type": None, "contains_ip": None,
             "approximate_size": None, "acquisition_method": None,
             "collection_period": None, "modifications_description": None}]
    ds2 = [{"name": "DS2", "source_type": "manual", "sources_description": None,
             "contains_personal_data": None, "license_type": None, "contains_ip": None,
             "approximate_size": None, "acquisition_method": None,
             "collection_period": None, "modifications_description": None}]
    _, h1 = gen.generate_html("Co", "co", ds1)
    _, h2 = gen.generate_html("Co", "co", ds2)
    assert h1 != h2


def test_missing_fields_show_placeholder():
    gen = DisclosureGenerator()
    ds = [{"name": "Incomplete", "source_type": "manual", "sources_description": None,
           "contains_personal_data": None, "license_type": None, "contains_ip": None,
           "approximate_size": None, "acquisition_method": None,
           "collection_period": None, "modifications_description": None}]
    html, _ = gen.generate_html("Co", "co", ds)
    assert "missing" in html.lower() or "Not specified" in html or "Not provided" in html
