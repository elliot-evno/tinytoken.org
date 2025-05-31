import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

if (!process.env.STRIPE_PRICE_ID) {
  throw new Error('STRIPE_PRICE_ID is not set in environment variables');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_email } = body;

    if (!user_email) {
      return NextResponse.json(
        { error: 'user_email is required' },
        { status: 400 }
      );
    }

    // Get the host from the request headers
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    console.log('Creating checkout session with:', {
      email: user_email,
      baseUrl,
      priceId: process.env.STRIPE_PRICE_ID
    });

    // Create or retrieve the customer
    const customers = await stripe.customers.list({
      email: user_email,
      limit: 1
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user_email,
      });
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      automatic_tax: { enabled: true },
      customer_update: {
        address: 'auto',
      },
      billing_address_collection: 'required',
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}