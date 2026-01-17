from datetime import datetime
from uuid import UUID

from app.workers.celery_app import celery_app
from app.db.session import SyncSessionLocal
from app.models.sop import SOP, SOPStep
from app.models.export import Export, UserIntegration
from app.services.google_integration import GoogleDocsExporter
from app.services.notion_integration import NotionExporter


@celery_app.task(bind=True)
def export_to_google_docs_task(self, export_id: str, user_id: str):
    """Export SOP to Google Docs."""
    db = SyncSessionLocal()

    try:
        export = db.query(Export).filter(Export.id == UUID(export_id)).first()
        if not export:
            raise ValueError(f"Export not found: {export_id}")

        sop = db.query(SOP).filter(SOP.id == export.sop_id).first()
        if not sop:
            raise ValueError(f"SOP not found: {export.sop_id}")

        steps = (
            db.query(SOPStep)
            .filter(SOPStep.sop_id == sop.id)
            .order_by(SOPStep.step_number)
            .all()
        )

        # Get Google credentials
        integration = (
            db.query(UserIntegration)
            .filter(
                UserIntegration.user_id == UUID(user_id),
                UserIntegration.provider == "google",
            )
            .first()
        )

        if not integration:
            raise ValueError("Google integration not found")

        # Create exporter
        exporter = GoogleDocsExporter(
            access_token=integration.access_token,
            refresh_token=integration.refresh_token,
        )

        # Export
        doc_url = exporter.create_sop_document(sop, steps)

        # Update export record
        export.external_url = doc_url
        export.external_id = doc_url.split("/d/")[1].split("/")[0] if "/d/" in doc_url else None
        export.status = "completed"
        export.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "url": doc_url,
        }

    except Exception as e:
        export = db.query(Export).filter(Export.id == UUID(export_id)).first()
        if export:
            export.status = "error"
            export.error_message = str(e)
            export.completed_at = datetime.utcnow()
            db.commit()
        raise

    finally:
        db.close()


@celery_app.task(bind=True)
def export_to_notion_task(self, export_id: str, user_id: str):
    """Export SOP to Notion."""
    db = SyncSessionLocal()

    try:
        export = db.query(Export).filter(Export.id == UUID(export_id)).first()
        if not export:
            raise ValueError(f"Export not found: {export_id}")

        sop = db.query(SOP).filter(SOP.id == export.sop_id).first()
        if not sop:
            raise ValueError(f"SOP not found: {export.sop_id}")

        steps = (
            db.query(SOPStep)
            .filter(SOPStep.sop_id == sop.id)
            .order_by(SOPStep.step_number)
            .all()
        )

        # Get Notion credentials
        integration = (
            db.query(UserIntegration)
            .filter(
                UserIntegration.user_id == UUID(user_id),
                UserIntegration.provider == "notion",
            )
            .first()
        )

        if not integration:
            raise ValueError("Notion integration not found")

        # Create exporter
        exporter = NotionExporter(access_token=integration.access_token)

        # Get parent from config (either database_id or parent_page_id)
        database_id = export.export_config.get("database_id") if export.export_config else None
        parent_page_id = export.export_config.get("parent_page_id") if export.export_config else None

        # Export
        page_url = exporter.create_sop_page(
            sop=sop,
            steps=steps,
            database_id=database_id,
            parent_page_id=parent_page_id,
        )

        # Update export record
        export.external_url = page_url
        export.external_id = page_url.split("/")[-1].split("-")[-1] if "/" in page_url else None
        export.status = "completed"
        export.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "url": page_url,
        }

    except Exception as e:
        export = db.query(Export).filter(Export.id == UUID(export_id)).first()
        if export:
            export.status = "error"
            export.error_message = str(e)
            export.completed_at = datetime.utcnow()
            db.commit()
        raise

    finally:
        db.close()
