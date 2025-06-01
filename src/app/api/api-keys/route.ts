import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/stripe';

const TINYTOKEN_API = 'https://tinytoken-apikeys.vercel.app/api';
const TINYTOKEN_ADMIN_KEY = process.env.TINYTOKEN_ADMIN_KEY;

// Log environment variable status (but not the actual value)
console.log('Environment check:', {
  hasAdminKey: !!TINYTOKEN_ADMIN_KEY,
  nodeEnv: process.env.NODE_ENV,
});

if (!TINYTOKEN_ADMIN_KEY) {
  throw new Error('TINYTOKEN_ADMIN_KEY environment variable is not set');
}
interface ApiKey {
  api_key: string;
  user_email: string;
  created_at: string;
  active: boolean;
}

function maskKey(key: string): string {
  return key.slice(0, 5) + '...';
}

export async function GET() {
  try {
    const response = await fetch(`${TINYTOKEN_API}/keys/list`, {
      headers: new Headers({
        'x-admin-key': TINYTOKEN_ADMIN_KEY as string
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API keys');
    }

    const data = await response.json();
    return NextResponse.json({ keys: data.api_keys.map((key: ApiKey) => ({
      ...key,
      api_key: maskKey(key.api_key)
    })) });
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

    // Check if user has an active subscription
    const hasSubscription = await hasActiveSubscription(user_email);
    if (!hasSubscription) {
      return NextResponse.json(
        { 
          error: 'Active subscription required',
          subscription_required: true
        },
        { status: 403 }
      );
    }

    console.log('Creating API key for:', user_email);
    
    const response = await fetch(`${TINYTOKEN_API}/keys/create`, {
      method: 'POST',
      headers: {
        'x-admin-key': TINYTOKEN_ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email,
        description: description || 'Generated from dashboard'
      })
    });

    const responseData = await response.json();
    console.log('API response:', responseData);

    if (!response.ok) {
      return NextResponse.json(
        { error: responseData.error || 'Failed to create API key' },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Unexpected error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
} 