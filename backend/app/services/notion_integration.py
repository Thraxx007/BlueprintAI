from notion_client import Client
from pathlib import Path

import anthropic

from app.config import settings


class NotionExporter:
    """Export SOPs to Notion."""

    BLUEPRINTAI_PAGE_NAME = "BlueprintAI"

    # Fallback icon if Claude API fails
    DEFAULT_ICON = "📋"

    def __init__(self, access_token: str):
        self.client = Client(auth=access_token)
        self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _choose_icon_for_sop(self, title: str, description: str | None) -> str:
        """
        Use Claude to choose an appropriate emoji icon based on the SOP title and description.
        Returns a single emoji character.
        """
        try:
            context = f"Title: {title}"
            if description:
                context += f"\nDescription: {description}"

            response = self.anthropic_client.messages.create(
                model="claude-3-5-haiku-latest",
                max_tokens=10,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Choose a single emoji icon that best represents this Standard Operating Procedure (SOP).
The icon should visually represent the topic or action described.

{context}

Reply with ONLY a single emoji character, nothing else. Examples of good choices:
- For software/coding: 💻 🖥️ ⚙️ 🔧
- For data/analytics: 📊 📈 🗃️
- For communication: 📧 💬 📞
- For documents: 📄 📝 📑
- For security: 🔒 🛡️ 🔐
- For users/accounts: 👤 👥 🔑
- For settings/config: ⚙️ 🔧 🛠️
- For money/finance: 💰 💵 🏦
- For shipping/delivery: 📦 🚚 ✈️
- For healthcare: 🏥 💊 🩺
- For education: 📚 🎓 ✏️
- For marketing: 📣 🎯 📢
- For design: 🎨 ✨ 🖌️

Your response (single emoji only):"""
                    }
                ]
            )

            # Extract the emoji from the response
            emoji = response.content[0].text.strip()

            # Validate it's a single emoji (basic check)
            if len(emoji) <= 4 and emoji:  # Emojis can be 1-4 characters due to modifiers
                return emoji

            return self.DEFAULT_ICON

        except Exception as e:
            # If anything fails, return default icon
            print(f"Failed to choose icon via Claude: {e}")
            return self.DEFAULT_ICON

    def _find_or_create_blueprintai_page(self) -> str:
        """
        Find or create the 'BlueprintAI' parent page for all SOP exports.
        Returns the page ID.
        """
        # Search for existing BlueprintAI page
        search_result = self.client.search(
            query=self.BLUEPRINTAI_PAGE_NAME,
            page_size=50
        )

        for result in search_result.get("results", []):
            if result.get("object") == "page":
                title = self._get_page_title(result)
                if title.lower() == self.BLUEPRINTAI_PAGE_NAME.lower():
                    return result["id"]

        # BlueprintAI page not found - create it
        # First, find a workspace-level page to use as reference for creating at root level
        # Or create under the first accessible page
        all_pages = self.client.search(
            filter={"property": "object", "value": "page"},
            page_size=50
        )

        parent_for_blueprintai = None
        for p in all_pages.get("results", []):
            parent = p.get("parent", {})
            if parent.get("type") == "workspace":
                # This is a root-level page, we can create BlueprintAI as sibling
                parent_for_blueprintai = {"workspace": True}
                break

        # If no workspace-level access, create under first available page
        if not parent_for_blueprintai:
            if all_pages.get("results"):
                parent_for_blueprintai = {"page_id": all_pages["results"][0]["id"]}
            else:
                raise ValueError(
                    "No pages found in your Notion workspace. Please make sure your Notion integration "
                    "has access to at least one page. Go to Notion, open a page, click '...' menu -> "
                    "'Add connections' -> select your integration."
                )

        # Create the BlueprintAI page with a nice icon and cover
        blueprintai_page = self.client.pages.create(
            parent=parent_for_blueprintai,
            icon={"type": "emoji", "emoji": "📘"},
            properties={
                "title": {"title": [{"text": {"content": self.BLUEPRINTAI_PAGE_NAME}}]}
            },
            children=[
                {
                    "type": "callout",
                    "callout": {
                        "rich_text": [{"text": {"content": "Your AI-generated Standard Operating Procedures live here. Each SOP is organized as a subpage below."}}],
                        "icon": {"emoji": "🤖"},
                        "color": "blue_background",
                    },
                },
                {"type": "divider", "divider": {}},
            ]
        )

        return blueprintai_page["id"]

    def create_sop_page(
        self,
        sop,
        steps: list,
        parent_page_id: str | None = None,
        database_id: str | None = None,
    ) -> str:
        """
        Create a Notion page from an SOP with screenshots.
        All pages are created under the 'BlueprintAI' parent page.
        Returns the page URL.
        """
        # Choose an appropriate icon based on SOP content
        icon_emoji = self._choose_icon_for_sop(sop.title, sop.description)

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

        # Create page - always under BlueprintAI unless database specified
        if database_id:
            page = self.client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                icon={"type": "emoji", "emoji": icon_emoji},
                children=children[:100],  # Notion limit
            )
        else:
            # Always use BlueprintAI as parent (find or create it)
            blueprintai_page_id = self._find_or_create_blueprintai_page()

            page = self.client.pages.create(
                parent={"page_id": blueprintai_page_id},
                properties=properties,
                icon={"type": "emoji", "emoji": icon_emoji},
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
                    "icon": {"emoji": "📝"},
                    "color": "blue_background",
                },
            })

        # Add metadata section
        blocks.append({
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"text": {"content": "Total Steps: "}, "annotations": {"bold": True}},
                    {"text": {"content": str(len(steps))}},
                ],
            },
        })
        blocks.append({"type": "divider", "divider": {}})

        # Add Steps Checklist section header
        blocks.append({
            "type": "heading_1",
            "heading_1": {
                "rich_text": [{"text": {"content": "📋 Steps Checklist"}}],
                "color": "default",
            },
        })

        # Add to-do list of all steps for quick overview/tracking
        for step in steps:
            title = step.title or "Untitled Step"
            blocks.append({
                "type": "to_do",
                "to_do": {
                    "rich_text": [
                        {
                            "text": {"content": f"Step {step.step_number}: "},
                            "annotations": {"bold": True},
                        },
                        {"text": {"content": title}},
                    ],
                    "checked": False,
                    "color": "default",
                },
            })

        blocks.append({"type": "divider", "divider": {}})

        # Add Detailed Instructions section header
        blocks.append({
            "type": "heading_1",
            "heading_1": {
                "rich_text": [{"text": {"content": "📖 Detailed Instructions"}}],
                "color": "default",
            },
        })

        # Add table of contents for navigation
        blocks.append({
            "type": "table_of_contents",
            "table_of_contents": {"color": "gray"},
        })
        blocks.append({"type": "divider", "divider": {}})

        # Add each step with detailed content
        for step in steps:
            blocks.extend(self._build_step_blocks(step))

        return blocks

    def _build_step_blocks(self, step) -> list[dict]:
        """Build Notion blocks for a single step."""
        blocks = []

        # Step heading (non-toggleable heading_2)
        title = step.title or "Untitled Step"
        blocks.append({
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {
                        "text": {"content": f"Step {step.step_number}: "},
                        "annotations": {"color": "blue"},
                    },
                    {"text": {"content": title}},
                ],
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
                        "rich_text": [{"text": {"content": "Screenshot available in the original SOP"}}],
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

        # Step description in a quote block for visual distinction
        description = step.description or ""
        if description.strip():
            # Split long descriptions into multiple paragraphs
            paragraphs = description.split("\n\n")
            for i, para in enumerate(paragraphs):
                if para.strip():
                    # Use quote for first paragraph to highlight the main instruction
                    if i == 0:
                        blocks.append({
                            "type": "quote",
                            "quote": {
                                "rich_text": [{"text": {"content": para.strip()[:2000]}}],
                                "color": "default",
                            },
                        })
                    else:
                        blocks.append({
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"text": {"content": para.strip()[:2000]}}],
                            },
                        })

        # Click annotations as numbered list with action details
        if hasattr(step, "click_annotations") and step.click_annotations:
            # Add a small header for actions
            blocks.append({
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "text": {"content": "Actions:"},
                            "annotations": {"bold": True, "color": "gray"},
                        }
                    ],
                },
            })

            for annotation in step.click_annotations:
                action = annotation.action_description or annotation.element_description or "Click action"
                blocks.append({
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": [
                            {
                                "text": {"content": "🖱️ "},
                            },
                            {
                                "text": {"content": action},
                                "annotations": {"code": True},
                            },
                        ],
                    },
                })

        # Add spacing between steps
        blocks.append({
            "type": "paragraph",
            "paragraph": {"rich_text": []},
        })

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
