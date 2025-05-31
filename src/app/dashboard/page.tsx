'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ApiKey {
  key: string;
  user_email: string;
  description: string | null;
  created_at: string;
  expires_at: string;
  expires_in_days: number;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }

      const data = await response.json();
      // Safely handle the response and filter keys
      const keys = data.keys || [];
      const userKeys = keys.filter((key: ApiKey) => key.user_email === user?.email);
      setApiKeys(userKeys);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    fetchApiKeys();

    // Check for success/canceled params
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setSuccessMessage('Payment successful! You can now generate API keys.');
      // Clean up the URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (canceled === 'true') {
      setError('Payment canceled. Please try again to generate API keys.');
      // Clean up the URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [user, router, searchParams]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const redirectToCheckout = async () => {
    try {
      setError('');
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user?.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to redirect to checkout');
    }
  };

  const handleGenerateKey = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setSuccessMessage('');

      if (!user?.email) {
        throw new Error('User email not available');
      }

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          description: 'Generated from dashboard'
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if subscription is required
        if (response.status === 403 && responseData.subscription_required) {
          await redirectToCheckout();
          return;
        }
        throw new Error(responseData.error || 'Failed to create API key');
      }

      if (!responseData.key) {
        throw new Error('No API key was generated');
      }

      // Show success message with the new key
      alert(`Your new API key: ${responseData.key}\n\nPlease save this key securely as it won't be shown again.`);
      
      // Refresh the keys list
      await fetchApiKeys();
    } catch (err) {
      console.error('Error generating API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate API key. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
              <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Generate New Key'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* API Keys List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {apiKeys.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-500 bg-gray-100 rounded px-2 py-1">
                        {key.key}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No API keys found</p>
              <p className="text-sm text-gray-400">
                Generate a new key to get started with TinyToken API
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 