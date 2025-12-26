import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const SearchableInstitution = ({ 
  value, 
  onSelect, 
  selectedInstitutionId,
  placeholder = "Start typing institution name..."
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch institution suggestions
  const fetchInstitutions = async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(API_ENDPOINTS.SEARCH_INSTITUTIONS, {
        params: { q: query.trim() }
      });
      
      if (response.data.success) {
        setSuggestions(response.data.institutions || []);
        setShowSuggestions(true);
      } else {
        setError(response.data.message || 'Failed to fetch institutions');
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Institution search error:', err);
      setError('Failed to search institutions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search request
    searchTimeoutRef.current = setTimeout(() => {
      if (input.trim()) {
        fetchInstitutions(input);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectInstitution = (institution) => {
    setSearchTerm(institution.name);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Call parent callback with selected institution data
    onSelect({
      id: institution.id,
      name: institution.name
    });
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((institution) => (
            <button
              key={institution.id}
              type="button"
              onClick={() => handleSelectInstitution(institution)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-800">{institution.name}</div>
              {institution.description && (
                <div className="text-xs text-gray-500">{institution.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && searchTerm.trim() && suggestions.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3">
          <p className="text-sm text-gray-500">No institutions found. Try a different name.</p>
        </div>
      )}

      {/* Selected confirmation */}
      {selectedInstitutionId && (
        <p className="text-xs text-green-600 mt-1">✓ Institution selected (ID: {selectedInstitutionId})</p>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500 mt-1">Type the institution name and select from suggestions</p>
    </div>
  );
};

export default SearchableInstitution;