'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [compressedText, setCompressedText] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [tokenReduction, setTokenReduction] = useState<number | null>(null);
  const [originalTokens, setOriginalTokens] = useState<number | null>(null);
  const [compressedTokens, setCompressedTokens] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);

  const handleCompress = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to compress');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://api.tinytoken.org/compress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '1234' // Demo key
        },
        body: JSON.stringify({
          text: inputText,
          auto_quality: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCompressedText(data.compressed_text || data.text || '');
      setQualityScore(data.quality_score || null);
      setCompressionRatio(data.compression_ratio * 100 || null);
      
      const origTokens = data.original_length || inputText.split(/\s+/).length;
      const compTokens = data.compressed_length || (data.compressed_text || data.text || '').split(/\s+/).length;
      setOriginalTokens(origTokens);
      setCompressedTokens(compTokens);
      setTokenReduction(origTokens - compTokens);
      
    } catch (err) {
      console.error('Compression error:', err);
      setError('Failed to compress text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setCompressedText('');
    setQualityScore(null);
    setTokenReduction(null);
    setOriginalTokens(null);
    setCompressedTokens(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto relative">
        {/* Top Navigation */}
        <div className="absolute top-0 -right-34 pt-2 flex items-center space-x-4">
          <a
            href="https://github.com/elliot-evno/tinytoken.org"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:text-black transition-colors"
            title="View source on GitHub"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <button
            onClick={() => router.push(user ? '/dashboard' : '/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </button>
        </div>

        {/* Header Content */}
        <div className="text-center pt-16 mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            TinyToken
          </h1>
          <p className="text-black text-lg mb-8">
            Compress your prompts while maintaining meaning and readability
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Input Section */}
          <div className="mb-6">
            <label htmlFor="input-text" className="block text-sm font-medium text-black mb-2">
              Enter your text to compress:
            </label>
            <textarea
              id="input-text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black bg-white"
            />
            <div className="flex justify-between items-center mt-2">
              {originalTokens && <span className="text-sm text-black">
                {originalTokens} tokens
              </span>}
              <div className="space-x-2">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-black hover:text-black transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleCompress}
                  disabled={isLoading || !inputText.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  {isLoading ? 'Compressing...' : 'Compress Text'}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {compressedText && (
            <div className="space-y-6">
              {/* Compressed Text */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Compressed text:
                </label>
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-black whitespace-pre-wrap">{compressedText}</p>
                </div>
                {compressedTokens && <div className="mt-2 text-sm text-black">
                  {compressedTokens} tokens
                </div>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {qualityScore !== null && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-medium text-amber-800 mb-1">Quality Score</h3>
                    <p className="text-2xl font-bold text-amber-600">
                      {(qualityScore * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-amber-700">
                      How well the meaning is preserved
                    </p>
                  </div>
                )}

                {tokenReduction !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-1">Tokens Reduced</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.abs(tokenReduction)}
                    </p>
                    <p className="text-sm text-blue-700">
                      Number of tokens saved through compression
                    </p>
                  </div>
                )}
                {compressionRatio && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-medium text-purple-800 mb-1">Token Reduction</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {compressionRatio}%
                    </p>
                    <p className="text-sm text-purple-700">
                      Percentage of tokens saved through compression.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
