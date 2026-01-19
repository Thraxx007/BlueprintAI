import anthropic
import base64
import json
from PIL import Image
import io
from pathlib import Path

from app.config import settings


class ClaudeAnalyzer:
    """Claude AI service for analyzing screen recordings and generating SOP steps."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _prepare_image(self, image_path: str, max_size: int = 1568) -> str:
        """Resize and encode image for Claude API."""
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize if needed (Claude max is 1568px on longest side)
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            # Convert to PNG bytes
            buffer = io.BytesIO()
            img.save(buffer, format="PNG", optimize=True)
            return base64.standard_b64encode(buffer.getvalue()).decode("utf-8")

    def analyze_frame_sequence(
        self,
        frame_paths: list[str],
        user_context: str,
        previous_steps: list[dict] | None = None,
    ) -> list[dict]:
        """
        Analyze a sequence of frames to detect UI changes and actions.

        Returns list of detected steps with:
        - step_description
        - click_locations
        - element_descriptions
        """
        # Prepare images
        images = []
        for path in frame_paths:
            if not Path(path).exists():
                continue
            images.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": self._prepare_image(path),
                },
            })

        if not images:
            return []

        # Build context from previous steps
        context = ""
        if previous_steps:
            context = "Previous steps in this SOP:\n"
            for step in previous_steps[-5:]:
                context += f"- {step.get('description', '')}\n"

        system_prompt = """You are an expert at analyzing screen recordings to create step-by-step Standard Operating Procedures (SOPs).

For each significant UI change between frames, identify:
1. What action was taken (click, type, scroll, etc.)
2. Where the action occurred (element description and approximate coordinates)
3. A clear, concise step description for the SOP

Focus on actionable steps that a user would need to follow to replicate the process.
Ignore minor visual changes that don't represent user actions.

IMPORTANT: Respond ONLY with valid JSON, no other text."""

        user_prompt = f"""Context provided by user: {user_context}

{context}

Analyze the following sequence of {len(images)} screenshots (numbered 0 to {len(images) - 1}) from a screen recording.
Your task is to identify what actions the user took and create clear SOP steps.

CRITICAL INSTRUCTIONS FOR FRAME SELECTION:
- For each step, you must specify WHICH FRAME best shows where the user should look/click to perform that action
- Choose the frame that shows the UI BEFORE the action is taken (so the user can see what to click)
- If frame 0 shows a button and frame 1 shows the result after clicking, use frame_index: 0 for the "click button" step
- The frame should show the element/area that needs to be interacted with

For each step detected, provide:
1. step_number: Sequential number starting from 1
2. title: Brief action title (e.g., "Click the New Project button")
3. description: Detailed step description explaining what to do and why
4. frame_index: The frame (0 to {len(images) - 1}) that BEST SHOWS the UI element/area to interact with for this step. This should be the frame BEFORE the action occurs, showing where to click/type.
5. click_location: If a click occurred, provide the location ON THE SELECTED FRAME where the click target is visible:
   - x_percentage: horizontal position as percentage (0-100, where 0=left edge, 100=right edge)
   - y_percentage: vertical position as percentage (0-100, where 0=top edge, 100=bottom edge)
   - element_description: what element should be clicked
   - action_description: what this click accomplishes
   - click_type: left_click, right_click, or double_click
6. keyboard_input: Any text typed or shortcuts used (null if none)

IMPORTANT: Each step's frame_index should point to the frame where the user can SEE the element they need to interact with. The click_location coordinates must accurately point to that element ON THAT FRAME.

Respond in this exact JSON format:
{{
    "steps": [
        {{
            "step_number": 1,
            "title": "Click the New Project button",
            "description": "Click on the 'New Project' button in the top toolbar to begin creating a new project.",
            "frame_index": 0,
            "click_location": {{
                "x_percentage": 45.5,
                "y_percentage": 20.0,
                "element_description": "New Project button in the toolbar",
                "action_description": "Opens the new project dialog",
                "click_type": "left_click"
            }},
            "keyboard_input": null
        }}
    ]
}}"""

        response = self.client.messages.create(
            model=settings.CLAUDE_VISION_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": images + [{"type": "text", "text": user_prompt}],
                }
            ],
        )

        # Parse JSON response
        try:
            response_text = response.content[0].text.strip()
            # Handle potential markdown code blocks
            if "```" in response_text:
                parts = response_text.split("```")
                for part in parts:
                    if part.strip().startswith("json"):
                        response_text = part.strip()[4:].strip()
                        break
                    elif part.strip().startswith("{"):
                        response_text = part.strip()
                        break

            # Try to fix common JSON issues
            import re
            # Remove trailing commas before } or ]
            response_text = re.sub(r',\s*}', '}', response_text)
            response_text = re.sub(r',\s*]', ']', response_text)

            result = json.loads(response_text)
            return result.get("steps", [])
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            # Find the outermost JSON object
            json_match = re.search(r'\{[\s\S]*"steps"\s*:\s*\[[\s\S]*\][\s\S]*\}', response_text)
            if json_match:
                try:
                    json_str = json_match.group()
                    # Fix trailing commas
                    json_str = re.sub(r',\s*}', '}', json_str)
                    json_str = re.sub(r',\s*]', ']', json_str)
                    result = json.loads(json_str)
                    return result.get("steps", [])
                except json.JSONDecodeError:
                    pass

            # Last resort: try to extract individual step objects
            step_matches = re.findall(r'\{[^{}]*"step_number"\s*:\s*\d+[^{}]*\}', response_text)
            if step_matches:
                steps = []
                for match in step_matches:
                    try:
                        step = json.loads(match)
                        steps.append(step)
                    except:
                        pass
                return steps
            return []

    def generate_step_description(
        self,
        screenshot_path: str,
        action_summary: str,
        user_context: str,
        detail_level: str = "detailed",
    ) -> str:
        """Generate a polished step description using Sonnet for better prose."""
        if not Path(screenshot_path).exists():
            return action_summary

        image_data = self._prepare_image(screenshot_path)

        detail_instructions = {
            "brief": "Keep the description to 1-2 sentences.",
            "detailed": "Provide a clear 2-4 sentence description with specific UI element names.",
            "comprehensive": "Provide a thorough description including visual cues, expected outcomes, and tips.",
        }

        response = self.client.messages.create(
            model=settings.CLAUDE_TEXT_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": f"""Based on this screenshot and the action summary below,
write a clear SOP step description.

Context: {user_context}
Action: {action_summary}

{detail_instructions.get(detail_level, detail_instructions['detailed'])}

Write only the step description, no other text:""",
                        },
                    ],
                }
            ],
        )

        return response.content[0].text.strip()

    def detect_click_location(
        self,
        before_frame: str,
        after_frame: str,
    ) -> dict:
        """Compare two frames to detect where a click occurred."""
        if not Path(before_frame).exists() or not Path(after_frame).exists():
            return {"click_detected": False}

        images = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": self._prepare_image(before_frame),
                },
            },
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": self._prepare_image(after_frame),
                },
            },
        ]

        response = self.client.messages.create(
            model=settings.CLAUDE_VISION_MODEL,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": images + [
                        {
                            "type": "text",
                            "text": """Compare these two consecutive screenshots.
Identify where a click likely occurred to cause the UI change.

Respond ONLY with this JSON format:
{
    "click_detected": true,
    "x_percentage": 45.5,
    "y_percentage": 20.0,
    "element_clicked": "description of element",
    "confidence": "high"
}

If no click was detected, respond with:
{"click_detected": false}""",
                        }
                    ],
                }
            ],
        )

        try:
            response_text = response.content[0].text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            return json.loads(response_text)
        except json.JSONDecodeError:
            return {"click_detected": False}

    def generate_sop_from_transcript(
        self,
        transcript: str,
        user_context: str | None = None,
        detail_level: str = "detailed",
    ) -> dict:
        """
        Generate a structured SOP from an audio transcript.

        Args:
            transcript: The transcribed audio text
            user_context: Optional context about what the audio describes
            detail_level: brief, detailed, or comprehensive

        Returns:
            Dict with title, description, and steps
        """
        detail_instructions = {
            "brief": "Keep each step to 1-2 concise sentences.",
            "detailed": "Provide clear 2-4 sentence descriptions for each step with specific details.",
            "comprehensive": "Provide thorough descriptions including tips, warnings, and expected outcomes.",
        }

        system_prompt = """You are an expert at creating Standard Operating Procedures (SOPs) from verbal descriptions and instructions.

Your task is to analyze a transcript of someone describing a process or workflow and convert it into a clear, actionable SOP.

Key principles:
1. Identify distinct steps in the process
2. Put steps in logical order (even if described out of order in the transcript)
3. Clarify vague instructions into specific actions
4. Remove filler words, repetitions, and tangents
5. Add implicit steps that may have been assumed but not stated
6. Use clear, imperative language (e.g., "Click the button" not "You should click the button")

IMPORTANT: Respond ONLY with valid JSON, no other text."""

        user_prompt = f"""Analyze the following transcript and create a structured SOP.

{f"Context provided by user: {user_context}" if user_context else ""}

Transcript:
\"\"\"
{transcript}
\"\"\"

{detail_instructions.get(detail_level, detail_instructions['detailed'])}

Create an SOP with the following JSON structure:
{{
    "title": "Clear, descriptive title for the SOP",
    "description": "Brief overview of what this SOP covers (1-2 sentences)",
    "steps": [
        {{
            "step_number": 1,
            "title": "Brief action title",
            "description": "Detailed step description"
        }}
    ],
    "notes": ["Any important notes, warnings, or tips mentioned"],
    "estimated_time": "Estimated time to complete (if determinable, otherwise null)"
}}"""

        response = self.client.messages.create(
            model=settings.CLAUDE_TEXT_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        # Parse JSON response
        try:
            response_text = response.content[0].text.strip()
            # Handle potential markdown code blocks
            if "```" in response_text:
                parts = response_text.split("```")
                for part in parts:
                    if part.strip().startswith("json"):
                        response_text = part.strip()[4:].strip()
                        break
                    elif part.strip().startswith("{"):
                        response_text = part.strip()
                        break

            # Fix common JSON issues
            import re
            response_text = re.sub(r',\s*}', '}', response_text)
            response_text = re.sub(r',\s*]', ']', response_text)

            result = json.loads(response_text)
            return result
        except json.JSONDecodeError:
            # Return a basic structure if parsing fails
            return {
                "title": "Generated SOP",
                "description": "SOP generated from audio transcript",
                "steps": [
                    {
                        "step_number": 1,
                        "title": "Review transcript",
                        "description": transcript[:500] + "..." if len(transcript) > 500 else transcript,
                    }
                ],
                "notes": ["Unable to parse structured response - please review and edit"],
                "estimated_time": None,
            }

    def cluster_workflows(
        self,
        frame_paths: list[str],
        user_description: str,
    ) -> list[dict]:
        """
        Analyze sample frames and group them into distinct workflows/processes.
        Used for full-day recordings.
        """
        images = []
        for path in frame_paths:
            if not Path(path).exists():
                continue
            images.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": self._prepare_image(path),
                },
            })

        if not images:
            return []

        response = self.client.messages.create(
            model=settings.CLAUDE_TEXT_MODEL,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": images + [
                        {
                            "type": "text",
                            "text": f"""These screenshots are samples from a full-day screen recording.
User description: {user_description}

Group them into distinct workflows or processes based on:
- The application being used
- The type of task being performed

Return ONLY this JSON format:
{{
    "workflows": [
        {{
            "name": "Creating a new project",
            "description": "Steps for creating and configuring a new project",
            "frame_indices": [0, 1, 2],
            "suggested_title": "How to Create a New Project"
        }}
    ]
}}""",
                        }
                    ],
                }
            ],
        )

        try:
            response_text = response.content[0].text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            result = json.loads(response_text)
            return result.get("workflows", [])
        except json.JSONDecodeError:
            return []
