import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

if (!process.env.STRIPE_PRICE_ID) {
  throw new Error('STRIPE_PRICE_ID is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

const DEFAULT_FEATURES = [
  'Unlimited API calls',
  '30-day API key validity',
  'Usage analytics'
];

export async function GET() {
  try {
    console.log('Fetching price with ID:', process.env.STRIPE_PRICE_ID);
    
    // Fetch the price using the price ID from environment variables
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID, {
      expand: ['product'],
    });

    if (!price) {
      console.error('No price found for ID:', process.env.STRIPE_PRICE_ID);
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      );
    }

    const product = price.product as Stripe.Product;
    if (!product) {
      console.error('No product found for price:', price.id);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Extract features from product metadata with better error handling
    let features = DEFAULT_FEATURES;
    try {
      if (product.metadata?.features) {
        const parsedFeatures = JSON.parse(product.metadata.features);
        if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
          features = parsedFeatures;
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse features from metadata, using defaults:', parseError);
    }

    const response = {
      name: product.name || 'TinyToken API Access',
      description: product.description || 'Access to the TinyToken API',
      price: price.unit_amount! / 100, // Convert from cents to dollars
      interval: price.recurring?.interval || 'month',
      features,
    };

    console.log('Returning pricing data:', response);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Error fetching pricing data:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
} 