/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';

const TINYTOKEN_ADMIN_KEY = process.env.TINYTOKEN_ADMIN_KEY;

interface ApiKey {
  api_key: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(
  request: NextRequest,
  context: any
) {
  const { params } = context;
  try {
    if (!params.key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }
    const maskedKey = params.key;
    console.log('Admin key:', TINYTOKEN_ADMIN_KEY);
    console.log('Deactivating masked key:', maskedKey);

    // Fetch all keys to find the full key
    const listResponse = await fetch('https://api.tinytoken.org/api-keys/list', {
      headers: {
        'x-admin-key': TINYTOKEN_ADMIN_KEY || '',
      },
    });
    const listData = await listResponse.json();
    const match = (listData.api_keys || []).find((k: ApiKey) => {
      // Mask the key the same way as in the backend
      return (k.api_key && k.api_key.slice(0, 5) + '...' === maskedKey);
    });
    if (!match) {
      return NextResponse.json({ error: 'Full API key not found for masked key' }, { status: 404 });
    }
    const fullKey = match.api_key;
    console.log('Full key to deactivate:', fullKey);

    // Call the TinyToken API to deactivate the full key
    const response = await fetch(`https://api.tinytoken.org/api-keys/deactivate/${fullKey}`, 
      {
        method: 'POST',
        headers: {
          'x-admin-key': TINYTOKEN_ADMIN_KEY || '',
        },
      }
    );

    const responseText = await response.text();
    console.log('Deactivate endpoint response:', responseText);
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: responseJson.error || responseText || 'Failed to deactivate API key' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'API key deactivated', deactivateResponse: responseJson });
  } catch (error) {
    console.error('Error deactivating API key:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate API key' },
      { status: 500 }
    );
  }
}