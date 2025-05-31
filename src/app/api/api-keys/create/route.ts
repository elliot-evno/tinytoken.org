import { NextResponse } from 'next/server';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import crypto from 'crypto';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase app if not already initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();
const TINYTOKEN_ADMIN_KEY = process.env.TINYTOKEN_ADMIN_KEY;

if (!TINYTOKEN_ADMIN_KEY) {
  throw new Error('TINYTOKEN_ADMIN_KEY environment variable is not set');
}

function generateApiKey() {
  // Generate a random key with tt_ prefix
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 characters in base64
  const key = 'tt_' + randomBytes.toString('base64').replace(/[+/]/g, '').slice(0, 32);
  return key;
}

export async function POST(request: Request) {
  try {
    // Check admin authentication
    const adminKey = request.headers.get('x-admin-key');
    if (!adminKey || adminKey !== TINYTOKEN_ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized - Invalid admin key' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { user_email, description } = body;

    if (!user_email) {
      return NextResponse.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Generate a new API key
    const apiKey = generateApiKey();
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store the API key in Firestore
    const apiKeysRef = collection(db, 'api_keys');
    await addDoc(apiKeysRef, {
      key: apiKey,
      user_email: user_email,
      description: description || null,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active'
    });

    return NextResponse.json({
      key: apiKey,
      user_email: user_email,
      description: description || null,
      expires_in_days: 30,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
} 