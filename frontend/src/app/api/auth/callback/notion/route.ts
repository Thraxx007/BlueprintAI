import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL for server-side calls
const API_URL = process.env.INTERNAL_API_URL || 'http://backend:8000';
// Public URL for redirects (what the user's browser should see)
const PUBLIC_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Notion OAuth error:', error);
    return NextResponse.redirect(`${PUBLIC_URL}/settings/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${PUBLIC_URL}/settings/integrations?error=missing_code`);
  }

  try {
    // Forward the code to the backend
    const response = await fetch(
      `${API_URL}/api/v1/integrations/notion/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend callback error:', errorData);
      return NextResponse.redirect(
        `${PUBLIC_URL}/settings/integrations?error=${encodeURIComponent(errorData.detail || 'callback_failed')}`
      );
    }

    // Success - redirect to settings page
    return NextResponse.redirect(`${PUBLIC_URL}/settings/integrations?connected=notion`);
  } catch (error) {
    console.error('Notion callback error:', error);
    return NextResponse.redirect(`${PUBLIC_URL}/settings/integrations?error=connection_failed`);
  }
}
