import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const TINYTOKEN_API = 'https://tinytoken-api-ha6fhptkoa-uc.a.run.app';
const TINYTOKEN_ADMIN_KEY = process.env.TINYTOKEN_ADMIN_KEY;

// Log environment variable status (but not the actual value)
console.log('Environment check:', {
  hasAdminKey: !!TINYTOKEN_ADMIN_KEY,
  nodeEnv: process.env.NODE_ENV,
});

if (!TINYTOKEN_ADMIN_KEY) {
  throw new Error('TINYTOKEN_ADMIN_KEY environment variable is not set');
}

function maskApiKey(key: string): string {
  if (!key) return '';
  // Show first 8 and last 4 characters, mask the rest
  return `${key.slice(0, 5)}...`;
}

export async function GET(request: Request) {
  try {
    const response = await fetch(`${TINYTOKEN_API}/api-keys/list`, {
      headers: new Headers({
        'x-admin-key': TINYTOKEN_ADMIN_KEY as string
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API keys from TinyToken API');
    }

    const data = await response.json();
    
    // Transform and mask the API keys
    const transformedKeys = (data.api_keys || []).map((key: any) => ({
      key: maskApiKey(key.api_key),
      user_email: key.user_email,
      description: key.description,
      expires_in_days: key.expires_in_days,
      created_at: key.created_at || new Date().toISOString(),
      expires_at: key.expires_at || new Date(Date.now() + (key.expires_in_days || 30) * 24 * 60 * 60 * 1000).toISOString()
    }));

    return NextResponse.json({ keys: transformedKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys', keys: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Double check environment variable
    if (!TINYTOKEN_ADMIN_KEY) {
      console.error('TINYTOKEN_ADMIN_KEY is not available in the POST handler');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user_email, description } = body;

    if (!user_email) {
      return NextResponse.json({ error: 'user_email is required' }, { status: 400 });
    }

    console.log('Creating API key for:', user_email);
    console.log('Using TinyToken API URL:', `${TINYTOKEN_API}/api-keys/create`);

    const requestBody = {
      user_email,
      description: description || 'Generated from dashboard'
    };

    console.log('Request body:', requestBody);

    const requestHeaders = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-admin-key': TINYTOKEN_ADMIN_KEY as string
    });

    console.log('Making request to TinyToken API...');
    
    const response = await fetch(`${TINYTOKEN_API}/api-keys/create`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log('Response headers:', responseHeaders);

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!responseText) {
      console.error('Empty response received');
      return NextResponse.json(
        { error: 'Empty response from TinyToken API' },
        { status: 500 }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response data:', responseData);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      return NextResponse.json(
        { error: 'Invalid JSON response from TinyToken API' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorMessage = responseData.error || `API request failed with status ${response.status}`;
      console.error('API error:', errorMessage, responseData);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Check if we got an API key in the response
    if (!responseData.api_key) {
      console.error('Response missing api_key field:', responseData);
      return NextResponse.json(
        { error: 'API response missing api_key field' },
        { status: 500 }
      );
    }

    // Transform the response to match our expected format
    const transformedResponse = {
      key: responseData.api_key,
      user_email: responseData.user_email,
      description: responseData.description,
      expires_in_days: responseData.expires_in_days,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + responseData.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    };

    // Success! Return the transformed API key data
    return NextResponse.json(transformedResponse);
  } catch (error: any) {
    console.error('Unexpected error creating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
} 