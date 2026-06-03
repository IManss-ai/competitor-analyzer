"""
Generates AB 2013 Section 22602 compliant training data disclosures.
"""
from __future__ import annotations
import hashlib
from datetime import datetime

DISCLOSURE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Training Data Disclosure — {{ company_name }}</title>
<style>
  body { font-family: Georgia, serif; max-width: 860px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; padding: 0 24px; }
  h1 { font-size: 1.8rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
  h2 { font-size: 1.2rem; margin-top: 0.5rem; color: #444; }
  .dataset { border: 1px solid #ddd; border-radius: 8px; padding: 24px; margin: 24px 0; }
  .dataset-name { font-size: 1.1rem; font-weight: bold; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  td:first-child { width: 35%; font-weight: 500; color: #555; }
  .missing { color: #c0392b; font-style: italic; }
  .footer { margin-top: 40px; font-size: 0.85rem; color: #777; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
<h1>Training Data Disclosure</h1>
<h2>{{ company_name }}</h2>
<p>Pursuant to California AB 2013 (Section 22602), the following discloses the training data used for AI systems.</p>
<p><em>Generated: {{ generated_at }}</em></p>
{% for ds in datasets %}
<div class="dataset">
  <div class="dataset-name">{{ ds.name }}</div>
  <table>
    <tr><td>Source Type</td><td>{{ ds.source_type or 'Not specified' }}</td></tr>
    <tr><td>Sources Description</td><td>{{ ds.sources_description or '<span class="missing">Not provided</span>' }}</td></tr>
    <tr><td>Contains Personal Data</td><td>{% if ds.contains_personal_data == true %}Yes{% elif ds.contains_personal_data == false %}No{% else %}<span class="missing">Not specified</span>{% endif %}</td></tr>
    <tr><td>License Type</td><td>{{ ds.license_type or '<span class="missing">Not specified</span>' }}</td></tr>
    <tr><td>Contains Intellectual Property</td><td>{% if ds.contains_ip == true %}Yes{% elif ds.contains_ip == false %}No{% else %}<span class="missing">Not specified</span>{% endif %}</td></tr>
    <tr><td>Approximate Size</td><td>{{ ds.approximate_size or '<span class="missing">Not specified</span>' }}</td></tr>
    <tr><td>Acquisition Method</td><td>{{ ds.acquisition_method or '<span class="missing">Not specified</span>' }}</td></tr>
    <tr><td>Collection Period</td><td>{{ ds.collection_period or '<span class="missing">Not specified</span>' }}</td></tr>
    <tr><td>Modifications</td><td>{{ ds.modifications_description or 'None' }}</td></tr>
  </table>
</div>
{% endfor %}
<div class="footer">
  This disclosure was generated automatically in compliance with California AB 2013.<br>
  Company slug: {{ company_slug }} | Generated: {{ generated_at }}
</div>
</body>
</html>"""


class DisclosureGenerator:
    def generate_html(self, company_name: str, company_slug: str, datasets: list[dict]) -> tuple[str, str]:
        """Returns (html_content, version_hash)."""
        from jinja2 import Template
        template = Template(DISCLOSURE_TEMPLATE)
        generated_at = datetime.utcnow().strftime("%B %d, %Y")
        html = template.render(
            company_name=company_name,
            company_slug=company_slug,
            datasets=datasets,
            generated_at=generated_at,
        )
        version_hash = hashlib.sha256(html.encode()).hexdigest()[:16]
        return html, version_hash
