from notion_client import Client
from pathlib import Path

from app.config import settings


class NotionExporter:
    """Export SOPs to Notion."""

    def __init__(self, access_token: str):
        self.client = Client(auth=access_token)

    def create_sop_page(
        self,
        sop,
        steps: list,
        parent_page_id: str | None = None,
        database_id: str | None = None,
    ) -> str:
        """
        Create a Notion page from an SOP with screenshots.
        Returns the page URL.
        """
        # Build page properties
        properties = {
            "title": {"title": [{"text": {"content": sop.title}}]},
        }

        # If adding to a database, include additional properties
        if database_id:
            properties.update({
                "Status": {"select": {"name": "Published"}},
            })

        # Build page content blocks
        children = self._build_sop_blocks(sop, steps)

        # Create page - Notion API requires a valid parent
        if database_id:
            page = self.client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                children=children[:100],  # Notion limit
            )
        elif parent_page_id:
            page = self.client.pages.create(
                parent={"page_id": parent_page_id},
                properties=properties,
                children=children[:100],
            )
        else:
            # No parent specified - try to find a suitable parent page
            # Look for a page named "SOP Creator" or similar, otherwise use the first root-level page
            search_result = self.client.search(page_size=50)
            pages = [r for r in search_result.get("results", []) if r.get("object") == "page"]

            if not pages:
                raise ValueError(
                    "No pages found in your Notion workspace. Please make sure your Notion integration has access to at least one page. "
                    "Go to Notion, open a page, click '...' menu -> 'Add connections' -> select your integration."
                )

            # Try to find a page named "SOP Creator" or "SOPs" to use as parent
            default_parent_id = None
            for p in pages:
                title = self._get_page_title(p).lower()
                if "sop" in title:
                    default_parent_id = p["id"]
                    break

            # If no SOP page found, use the first page that has a workspace parent (root level)
            if not default_parent_id:
                for p in pages:
                    parent = p.get("parent", {})
                    # Pages with workspace parent are at root level
                    if parent.get("type") == "workspace":
                        default_parent_id = p["id"]
                        break

            # Fallback to first page
            if not default_parent_id:
                default_parent_id = pages[0]["id"]

            page = self.client.pages.create(
                parent={"page_id": default_parent_id},
                properties=properties,
                children=children[:100],
            )

        # Append remaining blocks if more than 100
        if len(children) > 100:
            for i in range(100, len(children), 100):
                self.client.blocks.children.append(
                    block_id=page["id"],
                    children=children[i:i + 100],
                )

        return page["url"]

    def _build_sop_blocks(self, sop, steps: list) -> list[dict]:
        """Build Notion blocks for the SOP content."""
        blocks = []

        # Add description as callout
        if sop.description:
            blocks.append({
                "type": "callout",
                "callout": {
                    "rich_text": [{"text": {"content": sop.description}}],
                    "icon": {"emoji": "📋"},
                    "color": "blue_background",
                },
            })
            blocks.append({"type": "divider", "divider": {}})

        # Add table of contents
        blocks.append({
            "type": "table_of_contents",
            "table_of_contents": {"color": "default"},
        })
        blocks.append({"type": "divider", "divider": {}})

        # Add each step
        for step in steps:
            blocks.extend(self._build_step_blocks(step))

        return blocks

    def _build_step_blocks(self, step) -> list[dict]:
        """Build Notion blocks for a single step."""
        blocks = []

        # Step heading
        title = step.title or "Untitled Step"
        blocks.append({
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{
                    "text": {"content": f"Step {step.step_number}: {title}"}
                }],
                "color": "default",
            },
        })

        # Screenshot as image block
        screenshot_path = step.annotated_screenshot_path or step.screenshot_path
        if screenshot_path and Path(screenshot_path).exists():
            # Check if PUBLIC_URL is accessible from the internet
            # localhost URLs won't work in Notion
            public_url = settings.PUBLIC_URL
            is_localhost = "localhost" in public_url or "127.0.0.1" in public_url

            if is_localhost:
                # Add a note that image is available locally
                blocks.append({
                    "type": "callout",
                    "callout": {
                        "rich_text": [{"text": {"content": f"📷 Screenshot available (see original SOP for image)"}}],
                        "icon": {"emoji": "🖼️"},
                        "color": "gray_background",
                    },
                })
            else:
                # For external images, we need a public URL
                rel_path = str(Path(screenshot_path).relative_to(settings.STORAGE_PATH))
                image_url = f"{public_url}/static/{rel_path}"

                blocks.append({
                    "type": "image",
                    "image": {
                        "type": "external",
                        "external": {"url": image_url},
                    },
                })

        # Step description as paragraph
        description = step.description or ""
        # Split long descriptions into multiple paragraphs
        paragraphs = description.split("\n\n")
        for para in paragraphs:
            if para.strip():
                blocks.append({
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"text": {"content": para.strip()[:2000]}}],  # Notion limit
                    },
                })

        # Click annotations as bulleted list
        if hasattr(step, "click_annotations") and step.click_annotations:
            for annotation in step.click_annotations:
                action = annotation.action_description or annotation.element_description or "Click action"
                blocks.append({
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{
                            "text": {"content": f"🖱️ {action}"}
                        }],
                    },
                })

        # Divider between steps
        blocks.append({"type": "divider", "divider": {}})

        return blocks

    def list_databases(self) -> list[dict]:
        """List all databases the integration has access to."""
        response = self.client.search(
            filter={"property": "object", "value": "database"}
        )
        return [
            {
                "id": db["id"],
                "title": db["title"][0]["plain_text"] if db.get("title") else "Untitled",
                "url": db["url"],
            }
            for db in response.get("results", [])
        ]

    def list_pages(self) -> list[dict]:
        """List all pages the integration has access to."""
        response = self.client.search(
            filter={"property": "object", "value": "page"}
        )
        return [
            {
                "id": page["id"],
                "title": self._get_page_title(page),
                "url": page["url"],
            }
            for page in response.get("results", [])
        ]

    def _get_page_title(self, page: dict) -> str:
        """Extract page title from page object."""
        properties = page.get("properties", {})
        title_prop = properties.get("title") or properties.get("Name")
        if title_prop and title_prop.get("title"):
            return title_prop["title"][0]["plain_text"] if title_prop["title"] else "Untitled"
        return "Untitled"
