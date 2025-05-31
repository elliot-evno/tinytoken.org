import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil'
});

export async function hasActiveSubscription(email: string): Promise<boolean> {
  try {
    // Find the customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return false;
    }

    const customer = customers.data[0];

    // Get all subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    return subscriptions.data.length > 0;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
} 