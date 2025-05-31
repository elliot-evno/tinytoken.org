import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function createApiKey(userId: string) {
  try {
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
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
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
          const apiKey = await createApiKey(userId);

          // Store the API key in your database associated with the user
          // You'll need to implement this part based on your database setup
          
          // For example, using Firebase:
          // await admin.firestore().collection('users').doc(userId).update({
          //   apiKey,
          //   subscriptionStatus: 'active',
          //   subscriptionId: session.subscription
          // });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation
        // Revoke API key access
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 