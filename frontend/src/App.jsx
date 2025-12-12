import { useState } from 'react';
import API_BASE_URL, { API_ENDPOINTS } from './config/api';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const testHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(API_ENDPOINTS.HEALTH_CHECK);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Event Corner
        </h1>
        <p className="text-gray-600 mb-6">Testing API Connection</p>

        <button
          onClick={testHealthCheck}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out"
        >
          {loading ? 'Testing...' : 'Test API Health Check'}
        </button>

        {response && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold mb-2">✅ Success!</p>
            <pre className="text-green-700 text-sm overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold mb-2">❌ Error</p>
            <p className="text-red-700 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              API Base URL: {API_BASE_URL}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}