from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from pathlib import Path
import io

from app.config import settings


class GoogleDocsExporter:
    """Export SOPs to Google Docs with screenshots."""

    def __init__(self, access_token: str, refresh_token: str | None = None):
        self.creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        self.docs_service = build("docs", "v1", credentials=self.creds)
        self.drive_service = build("drive", "v3", credentials=self.creds)

    def create_sop_document(self, sop, steps: list) -> str:
        """
        Create a Google Doc from an SOP with screenshots.
        Returns the document URL.
        """
        # Create empty document
        doc = self.docs_service.documents().create(
            body={"title": sop.title}
        ).execute()
        doc_id = doc["documentId"]

        # Build document content
        requests = []
        current_index = 1

        # Add title
        title_text = f"{sop.title}\n\n"
        requests.append({
            "insertText": {
                "location": {"index": current_index},
                "text": title_text,
            }
        })
        current_index += len(title_text)

        # Add description if exists
        if sop.description:
            desc_text = f"{sop.description}\n\n"
            requests.append({
                "insertText": {
                    "location": {"index": current_index},
                    "text": desc_text,
                }
            })
            current_index += len(desc_text)

        # Add divider
        requests.append({
            "insertText": {
                "location": {"index": current_index},
                "text": "─" * 50 + "\n\n",
            }
        })
        current_index += 52

        # Apply initial formatting
        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={"requests": requests},
        ).execute()

        # Format title as Heading 1
        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={
                "requests": [
                    {
                        "updateParagraphStyle": {
                            "range": {"startIndex": 1, "endIndex": len(sop.title) + 1},
                            "paragraphStyle": {"namedStyleType": "HEADING_1"},
                            "fields": "namedStyleType",
                        }
                    }
                ]
            },
        ).execute()

        # Add each step
        for step in steps:
            self._add_step_to_document(doc_id, step)

        return f"https://docs.google.com/document/d/{doc_id}/edit"

    def _add_step_to_document(self, doc_id: str, step):
        """Add a single step with its screenshot to the document."""
        # Get current document length
        doc = self.docs_service.documents().get(documentId=doc_id).execute()
        end_index = doc["body"]["content"][-1]["endIndex"] - 1

        requests = []

        # Step heading
        step_heading = f"\nStep {step.step_number}: {step.title or 'Untitled'}\n\n"
        requests.append({
            "insertText": {
                "location": {"index": end_index},
                "text": step_heading,
            }
        })

        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={"requests": requests},
        ).execute()

        # Format heading
        doc = self.docs_service.documents().get(documentId=doc_id).execute()
        heading_start = end_index + 1
        heading_end = heading_start + len(step_heading.strip())

        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={
                "requests": [
                    {
                        "updateParagraphStyle": {
                            "range": {"startIndex": heading_start, "endIndex": heading_end},
                            "paragraphStyle": {"namedStyleType": "HEADING_2"},
                            "fields": "namedStyleType",
                        }
                    }
                ]
            },
        ).execute()

        # Get updated end index
        doc = self.docs_service.documents().get(documentId=doc_id).execute()
        end_index = doc["body"]["content"][-1]["endIndex"] - 1

        # Add screenshot if available
        screenshot_path = step.annotated_screenshot_path or step.screenshot_path
        if screenshot_path and Path(screenshot_path).exists():
            image_url = self._upload_image_to_drive(screenshot_path)
            if image_url:
                self.docs_service.documents().batchUpdate(
                    documentId=doc_id,
                    body={
                        "requests": [
                            {
                                "insertInlineImage": {
                                    "location": {"index": end_index},
                                    "uri": image_url,
                                    "objectSize": {
                                        "width": {"magnitude": 450, "unit": "PT"},
                                    },
                                }
                            }
                        ]
                    },
                ).execute()

                # Add newline after image
                doc = self.docs_service.documents().get(documentId=doc_id).execute()
                end_index = doc["body"]["content"][-1]["endIndex"] - 1

                self.docs_service.documents().batchUpdate(
                    documentId=doc_id,
                    body={
                        "requests": [
                            {
                                "insertText": {
                                    "location": {"index": end_index},
                                    "text": "\n\n",
                                }
                            }
                        ]
                    },
                ).execute()

        # Get updated end index for description
        doc = self.docs_service.documents().get(documentId=doc_id).execute()
        end_index = doc["body"]["content"][-1]["endIndex"] - 1

        # Add description
        description_text = f"{step.description}\n\n"
        self.docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={
                "requests": [
                    {
                        "insertText": {
                            "location": {"index": end_index},
                            "text": description_text,
                        }
                    }
                ]
            },
        ).execute()

    def _upload_image_to_drive(self, file_path: str) -> str | None:
        """Upload image to Drive and return public URL."""
        if not Path(file_path).exists():
            return None

        file_metadata = {
            "name": Path(file_path).name,
            "mimeType": "image/png",
        }

        media = MediaFileUpload(
            file_path,
            mimetype="image/png",
            resumable=True,
        )

        try:
            uploaded = self.drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id,webContentLink",
            ).execute()

            # Make file publicly accessible
            self.drive_service.permissions().create(
                fileId=uploaded["id"],
                body={"type": "anyone", "role": "reader"},
            ).execute()

            # Return direct link for embedding
            return f"https://drive.google.com/uc?id={uploaded['id']}"
        except Exception as e:
            print(f"Failed to upload image: {e}")
            return None
