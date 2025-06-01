import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const TINYTOKEN_API = 'https://tinytoken-apikeys.vercel.app/api';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

async function createApiKey(userId: string): Promise<string> {
  const response = await fetch(`${TINYTOKEN_API}/keys/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': process.env.TINYTOKEN_ADMIN_KEY!,
    },
    body: JSON.stringify({
      user_email: userId,
      description: 'Created after subscription',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create API key');
  }

  const data = await response.json();
  return data.key;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
          await createApiKey(userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          // Deactivate all keys for this user
          const response = await fetch(`${TINYTOKEN_API}/keys/deactivate-all`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': process.env.TINYTOKEN_ADMIN_KEY!,
            },
            body: JSON.stringify({
              user_email: userId,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to deactivate user API keys');
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process webhook';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 