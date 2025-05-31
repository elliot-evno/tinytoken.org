import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    // Add console.log for debugging
    console.log('Creating checkout session for:', { userId, email });
    console.log('Using price ID:', process.env.STRIPE_PRICE_ID);
    console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}`,
      customer_email: email,
      metadata: {
        userId,
      },
    });

    console.log('Session created:', { sessionId: session.id, url: session.url });
    return NextResponse.json({ sessionUrl: session.url });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 