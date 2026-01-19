import React from 'react';
import { FiMapPin, FiGlobe } from 'react-icons/fi';
import MapPicker from './MapPicker';

const LocationSection = ({ formData, handleInputChange, updateLocation }) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
        <FiMapPin className="mr-2 text-blue-600" />
        Event Location
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Venue Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={`radio-card ${formData.venueType === 'physical' ? 'radio-card-active' : ''}`}>
              <input
                type="radio"
                name="venueType"
                value="physical"
                checked={formData.venueType === 'physical'}
                onChange={handleInputChange}
                className="sr-only"
              />
              <div className="text-center">
                <FiMapPin className="text-2xl mx-auto mb-2" />
                <span className="font-semibold">Physical Venue</span>
              </div>
            </label>

            <label className={`radio-card ${formData.venueType === 'online' ? 'radio-card-active' : ''}`}>
              <input
                type="radio"
                name="venueType"
                value="online"
                checked={formData.venueType === 'online'}
                onChange={handleInputChange}
                className="sr-only"
              />
              <div className="text-center">
                <FiGlobe className="text-2xl mx-auto mb-2" />
                <span className="font-semibold">Online Event</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Venue Name
          </label>
          <input
            type="text"
            name="venueName"
            value={formData.venueName}
            onChange={handleInputChange}
            placeholder="e.g., Grand Convention Hall"
            className="glass-input"
          />
        </div>

        {formData.venueType === 'online' ? (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Meeting Link / Platform
            </label>
            <textarea
              name="venueAddress"
              value={formData.venueAddress}
              onChange={handleInputChange}
              rows={3}
              placeholder="e.g., Zoom link or Google Meet URL"
              className="glass-input resize-none"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              <FiMapPin className="inline mr-1" />
              Search & Select Location on Map
            </label>
            <MapPicker updateLocation={updateLocation} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSection;
