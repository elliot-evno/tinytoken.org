import { NextRequest, NextResponse } from 'next/server';

const TINYTOKEN_API = 'https://tinytoken-apikeys.vercel.app/api';
const TINYTOKEN_ADMIN_KEY = process.env.TINYTOKEN_ADMIN_KEY;

interface ApiKey {
  api_key: string;
  user_email: string;
  created_at: string;
  active: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const maskedKey = params.key;
    if (!maskedKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // First, get the list of all keys to find the full key
    const listResponse = await fetch(`${TINYTOKEN_API}/keys/list`, {
      headers: {
        'x-admin-key': TINYTOKEN_ADMIN_KEY || ''
      }
    });

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const fullKey = listData.api_keys.find((key: ApiKey) => 
      key.api_key.startsWith(maskedKey.replace('...', ''))
    )?.api_key;

    if (!fullKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Now deactivate the full key
    const response = await fetch(`${TINYTOKEN_API}/keys/deactivate/${fullKey}`, {
      method: 'POST',
      headers: {
        'x-admin-key': TINYTOKEN_ADMIN_KEY || ''
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to deactivate API key' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'API key deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating API key:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate API key' },
      { status: 500 }
    );
  }
}