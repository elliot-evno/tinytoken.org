import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

async function createApiKey(userId: string): Promise<string> {
  const response = await fetch('https://api.tinytoken.org/api-keys/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TINYTOKEN_ADMIN_KEY}`,
    },
    body: JSON.stringify({
      userId,
      expiresIn: '30d',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create API key');
  }

  const data = await response.json();
  return data.apiKey;
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
          // Create API key for the user
          await createApiKey(userId);
          // Note: The API key is stored in the database by createApiKey
          // No need to store it again here
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        // Revoke API key access
        // TODO: Implement key revocation logic
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