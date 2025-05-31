'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

interface ApiKey {
  key: string;
  user_email: string;
  description: string | null;
  created_at: string;
  expires_at: string;
  expires_in_days: number;
  active?: boolean;
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
  const [deactivatingKeyId, setDeactivatingKeyId] = useState<string | null>(null);

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

  useEffect(() => {
    Prism.highlightAll();
  });

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

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to deactivate this API key? This action cannot be undone.')) {
      return;
    }

    setDeactivatingKeyId(keyId);

    try {
      const response = await fetch(`/api/api-keys/deactivate/${keyId}`, {
        method: 'POST',
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate API key');
      }

      // Refresh the keys list after successful deactivation
      await fetchApiKeys();
      setSuccessMessage('API key deactivated successfully');
    } catch (err) {
      console.error('Error deactivating API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate API key');
    } finally {
      setDeactivatingKeyId(null);
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12 sm:py-20">
            {/* Hero section */}
            <div className="text-center">
              <div className="mb-8">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-6">
                  🛠️ For LLM Product Builders
                </span>
              </div>
              <h1 className="text-5xl tracking-tight font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
                <span className="block">Optimize Your</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  LLM Token Usage
                </span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 sm:text-2xl">
                Reduce LLM API costs by compressing conversation histories and prompts 
                while preserving context quality. Built for developers shipping AI products.
              </p>
              
              {/* Benefits */}
              <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Cut API costs by 60-80%
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Maintain context quality
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Simple API integration
                </div>
              </div>

              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Start Building
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-4 border-2 border-gray-300 text-lg font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Try Demo
                </button>
                <button
                  onClick={() => window.open('https://docs.tinytoken.org', '_blank')}
                  className="px-8 py-4 border-2 border-blue-300 text-lg font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                >
                  View Docs
                </button>
              </div>
            </div>

            {/* Use Cases */}
            <div className="mt-24">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Implementation</h2>
                <p className="text-xl text-gray-600">Get started with our SDKs in minutes</p>
              </div>
              
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="group relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center mb-6">
                      <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg mr-4">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Python SDK</h3>
                    </div>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">main.py</div>
                        </div>
                        <div className="p-4">
                          <div className="mb-4">
                          </div>
                          <div>
                            <pre className="language-python"><code className="language-python">{`import tinytoken

client = tinytoken.TinyToken("your-api-key")
result = client.compress("Your text here")
print(result)`}</code></pre>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Python 3.7+ • Current version: 0.1.2
                    </p>
                  </div>
                </div>

                <div className="group relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center mb-6">
                      <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg mr-4">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">JavaScript SDK</h3>
                    </div>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">index.js</div>
                        </div>
                        <div className="p-4">
                          <div className="mb-4">
                          </div>
                          <div>
                            <pre className="language-javascript"><code className="language-javascript">{`import TinyToken from 'tinytoken';

const client = new TinyToken("your-api-key");
const result = await client.compress("Your text");`}</code></pre>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Node.js 14.0+ • Current version: 0.1.3
                    </p>
                  </div>
                </div>
              </div>

       
            </div>

            {/* Response Format */}
            <div className="mt-24">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Response Format</h2>
                <p className="text-xl text-gray-600">Simple compressed string output</p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Compression Result</h3>
                  </div>
                  <div className="p-8">
                    <div className="relative">
                      <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">example.py</div>
                        </div>
                        <div className="p-4">
                          <pre className="language-python"><code className="language-python">{`# Input
original_text = "This is a very long conversation history that needs to be compressed to save tokens and reduce API costs while maintaining the essential meaning and context."

# Output  
compressed_text = "Long conversation history compressed to save tokens, reduce costs, maintain meaning/context."`}</code></pre>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-700">
                          <strong>Simple Integration:</strong> The compress method returns a compressed string directly. 
                          No complex JSON parsing needed - just use the returned text in your LLM calls.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* REST API */}
            <div className="mt-24">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">REST API</h2>
                <p className="text-xl text-gray-600">Direct HTTP integration for any language</p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">curl</div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-6 text-white">Endpoint</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-2">HTTP Method & URL:</div>
                          <pre className="language-bash"><code className="language-bash">POST https://api.tinytoken.org/compress</code></pre>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Complete Example:</div>
                          <pre className="language-bash"><code className="language-bash">{`curl -X POST https://api.tinytoken.org/compress \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your conversation history or prompt here"}'`}</code></pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-24 py-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl text-white">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-8">Ready to optimize your LLM usage?</h2>
                <p className="text-xl text-blue-100 mb-8">
                  Start compressing your prompts and conversation histories today
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-blue-600 bg-white hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Get API Access
                  </button>
                  <button
                    onClick={() => window.open('https://docs.tinytoken.org', '_blank')}
                    className="px-8 py-4 border-2 border-white text-lg font-semibold rounded-xl text-white bg-transparent hover:bg-white hover:text-blue-600 transition-all duration-200"
                  >
                    Read Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors cursor-pointer ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Generate New Key'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {key.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleDeleteKey(key.key)}
                        className={`text-red-600 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-2 ${
                          deactivatingKeyId === key.key ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Delete API key"
                        disabled={deactivatingKeyId === key.key}
                      >
                        {deactivatingKeyId === key.key ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-1 text-red-400" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Deactivating...
                          </>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
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