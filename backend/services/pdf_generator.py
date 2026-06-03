"""PDF generation from HTML using WeasyPrint."""
from __future__ import annotations


class PDFGenerator:
    def generate(self, html_content: str) -> bytes:
        try:
            from weasyprint import HTML
            return HTML(string=html_content).write_pdf()
        except ImportError:
            raise RuntimeError(
                "WeasyPrint not installed. Install it with: pip install weasyprint"
            )
