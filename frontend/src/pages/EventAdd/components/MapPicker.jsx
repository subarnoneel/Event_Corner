import React, { useState, useRef, useEffect } from 'react';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { toast } from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPicker = ({ updateLocation }) => {
  const [mapState, setMapState] = useState({
    center: [23.8103, 90.4125],
    zoom: 12,
    marker: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Auto-search when user types
  useEffect(() => {
    const searchLocation = async () => {
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'EventCorner/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data.length === 0) {
          toast.error('No locations found');
        }
        setSearchResults(data);
      } catch (error) {
        toast.error('Failed to search location');
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    };

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation();
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    const locationData = {
      venueAddress: result.display_name || '',
      venueLat: lat,
      venueLng: lng,
      venueCity: result.address?.city || result.address?.town || result.address?.village || '',
      venueState: result.address?.state || '',
      venueCountry: result.address?.country || '',
      googlePlaceId: result.place_id?.toString() || ''
    };

    updateLocation(locationData);
    setSelectedLocation(locationData);

    setMapState({
      center: [lat, lng],
      zoom: 15,
      marker: [lat, lng]
    });

    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected!');

    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15);
    }
  };

  const handleMapClick = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EventCorner/1.0'
          }
        }
      );
      const data = await response.json();

      const locationData = {
        venueAddress: data.display_name || '',
        venueLat: lat,
        venueLng: lng,
        venueCity: data.address?.city || data.address?.town || data.address?.village || '',
        venueState: data.address?.state || '',
        venueCountry: data.address?.country || '',
        googlePlaceId: data.place_id?.toString() || ''
      };

      updateLocation(locationData);
      setSelectedLocation(locationData);

      toast.success('Location marked on map!');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const locationData = {
        venueLat: lat,
        venueLng: lng
      };
      updateLocation(locationData);
      toast.success('Location marked!');
    }

    setMapState(prev => ({
      ...prev,
      marker: [lat, lng]
    }));
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        handleMapClick(lat, lng);
      },
    });
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a location... (type at least 3 characters)"
          className="glass-input pl-10 pr-10"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="glass-card p-2 max-h-48 overflow-y-auto">
          {searchResults.map((result, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSearchResult(result)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors text-sm text-slate-700"
            >
              <FiMapPin className="inline mr-2 text-blue-600" />
              {result.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={mapState.center}
          zoom={mapState.zoom}
          style={{ width: '100%', height: '400px' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler />
          {mapState.marker && (
            <Marker position={mapState.marker} />
          )}
        </MapContainer>
      </div>

      {selectedLocation?.venueAddress && (
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Selected Location:</p>
          <p className="text-sm text-slate-600">{selectedLocation.venueAddress}</p>
          {selectedLocation.venueCity && (
            <p className="text-xs text-slate-500 mt-1">
              {selectedLocation.venueCity}{selectedLocation.venueState && `, ${selectedLocation.venueState}`}{selectedLocation.venueCountry && `, ${selectedLocation.venueCountry}`}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Coordinates: {selectedLocation.venueLat?.toFixed(6)}, {selectedLocation.venueLng?.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
