'use client';

import { useState } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [compressedText, setCompressedText] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [tokenReduction, setTokenReduction] = useState<number | null>(null);
  const [originalTokens, setOriginalTokens] = useState<number | null>(null);
  const [compressedTokens, setCompressedTokens] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
          'Authorization': `Bearer 1234`
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
      console.log(data);
      
      // Assuming the API returns something like:
      // { compressed_text: string, similarity_score: number, quality_score: number, original_tokens: number, compressed_tokens: number }
      setCompressedText(data.compressed_text || data.text || '');
      setQualityScore(data.quality_score || null);
      
      // Calculate token reduction
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            TinyToken
          </h1>
          <p className="text-black text-lg">
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-1">Similarity Score</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {(qualityScore * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-700">
                      How similar the compressed text is to the original
                    </p>
                  </div>
                )}

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
              </div>

              {/* Character Reduction */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-800 mb-2">Compression Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                
                  <div>
                    <span className="text-purple-700">Savings: </span>
                    <span className="font-medium text-black">
                      {((1 - compressedText.length / inputText.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-black text-sm">
          <p>Powered by TinyToken API <a href="https://docs.tinytoken.org" className="text-blue-600 hover:text-blue-800">tinytoken.org</a></p>
        </div>
      </div>
    </div>
  );
}
