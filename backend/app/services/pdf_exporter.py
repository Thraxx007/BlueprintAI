from pathlib import Path
from io import BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib import colors

from app.config import settings


class PDFExporter:
    """Export SOPs to PDF format."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the PDF."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='SOPTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=20,
            textColor=HexColor('#1e40af'),
        ))

        # Subtitle/description style
        self.styles.add(ParagraphStyle(
            name='SOPDescription',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=20,
            textColor=HexColor('#4b5563'),
            leading=16,
        ))

        # Step title style
        self.styles.add(ParagraphStyle(
            name='StepTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=8,
            textColor=HexColor('#1f2937'),
        ))

        # Step description style
        self.styles.add(ParagraphStyle(
            name='StepDescription',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=10,
            leading=14,
        ))

        # Click action style
        self.styles.add(ParagraphStyle(
            name='ClickAction',
            parent=self.styles['Normal'],
            fontSize=10,
            leftIndent=20,
            textColor=HexColor('#6b7280'),
        ))

    def create_sop_pdf(self, sop, steps: list, output_path: str | None = None) -> str:
        """
        Create a PDF document from an SOP.

        Args:
            sop: The SOP object with title, description, etc.
            steps: List of SOP steps
            output_path: Optional custom output path. If not provided, uses default storage.

        Returns:
            Path to the generated PDF file.
        """
        # Determine output path
        if output_path is None:
            exports_dir = settings.STORAGE_PATH / "exports"
            exports_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            safe_title = "".join(c for c in sop.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            safe_title = safe_title[:50].replace(' ', '_')
            output_path = str(exports_dir / f"{safe_title}_{timestamp}.pdf")

        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        # Build story (content)
        story = []

        # Title
        story.append(Paragraph(sop.title, self.styles['SOPTitle']))

        # Description
        if sop.description:
            story.append(Paragraph(sop.description, self.styles['SOPDescription']))

        # Metadata
        created_date = sop.created_at.strftime("%B %d, %Y") if hasattr(sop.created_at, 'strftime') else str(sop.created_at)
        meta_text = f"<font color='#6b7280'>Created: {created_date} | Steps: {len(steps)}</font>"
        story.append(Paragraph(meta_text, self.styles['Normal']))
        story.append(Spacer(1, 20))

        # Divider line
        story.append(Table(
            [['']],
            colWidths=[7 * inch],
            style=TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1, colors.lightgrey),
            ])
        ))
        story.append(Spacer(1, 20))

        # Steps
        for i, step in enumerate(steps):
            story.extend(self._build_step_content(step, i + 1))

        # Build PDF
        doc.build(story)

        return output_path

    def _build_step_content(self, step, step_number: int) -> list:
        """Build PDF content for a single step."""
        content = []

        # Step header with number
        title = step.title or f"Step {step_number}"
        step_title = f"<font color='#2563eb'>{step_number}.</font> {title}"
        content.append(Paragraph(step_title, self.styles['StepTitle']))

        # Screenshot
        screenshot_path = step.annotated_screenshot_path or step.screenshot_path
        if screenshot_path and Path(screenshot_path).exists():
            try:
                # Calculate image size to fit page width while maintaining aspect ratio
                max_width = 6.5 * inch
                max_height = 4 * inch

                img = Image(screenshot_path)
                img_width, img_height = img.wrap(0, 0)

                # Scale to fit
                aspect = img_height / img_width
                if img_width > max_width:
                    img_width = max_width
                    img_height = max_width * aspect

                if img_height > max_height:
                    img_height = max_height
                    img_width = max_height / aspect

                img = Image(screenshot_path, width=img_width, height=img_height)
                content.append(img)
                content.append(Spacer(1, 10))
            except Exception as e:
                # If image fails, add a note
                content.append(Paragraph(
                    f"<i>[Screenshot not available: {str(e)}]</i>",
                    self.styles['Normal']
                ))

        # Step description
        if step.description:
            # Handle newlines in description
            description = step.description.replace('\n', '<br/>')
            content.append(Paragraph(description, self.styles['StepDescription']))

        # Click annotations
        if hasattr(step, 'click_annotations') and step.click_annotations:
            content.append(Spacer(1, 5))
            click_header = "<font color='#dc2626'><b>Click Actions:</b></font>"
            content.append(Paragraph(click_header, self.styles['Normal']))

            for annotation in sorted(step.click_annotations, key=lambda x: x.sequence_order):
                action = annotation.action_description or annotation.element_description or "Click"
                click_text = f"<bullet>&bull;</bullet> <b>{annotation.sequence_order}.</b> {action}"
                content.append(Paragraph(click_text, self.styles['ClickAction']))

        content.append(Spacer(1, 15))

        return content

    def create_sop_pdf_bytes(self, sop, steps: list) -> bytes:
        """
        Create a PDF and return as bytes (for direct download).

        Args:
            sop: The SOP object
            steps: List of SOP steps

        Returns:
            PDF content as bytes
        """
        buffer = BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        # Build story (content)
        story = []

        # Title
        story.append(Paragraph(sop.title, self.styles['SOPTitle']))

        # Description
        if sop.description:
            story.append(Paragraph(sop.description, self.styles['SOPDescription']))

        # Metadata
        created_date = sop.created_at.strftime("%B %d, %Y") if hasattr(sop.created_at, 'strftime') else str(sop.created_at)
        meta_text = f"<font color='#6b7280'>Created: {created_date} | Steps: {len(steps)}</font>"
        story.append(Paragraph(meta_text, self.styles['Normal']))
        story.append(Spacer(1, 20))

        # Divider
        story.append(Table(
            [['']],
            colWidths=[7 * inch],
            style=TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1, colors.lightgrey),
            ])
        ))
        story.append(Spacer(1, 20))

        # Steps
        for i, step in enumerate(steps):
            story.extend(self._build_step_content(step, i + 1))

        # Build PDF
        doc.build(story)

        buffer.seek(0)
        return buffer.getvalue()
