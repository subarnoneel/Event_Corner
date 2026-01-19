import React from 'react';
import { FiMail, FiPhone, FiGlobe } from 'react-icons/fi';

const ContactSection = ({ formData, handleInputChange }) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">
        Registration & Contact Info
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Entry Fee (BDT)
          </label>
          <input
            type="number"
            name="entryFee"
            value={formData.entryFee}
            onChange={handleInputChange}
            placeholder="0 for free"
            className="glass-input"
          />
        </div> */}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <FiMail className="inline mr-1" />
            Contact Email
          </label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleInputChange}
            placeholder="contact@example.com"
            className="glass-input"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <FiPhone className="inline mr-1" />
            Contact Phone
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleInputChange}
            placeholder="+880 1XXX-XXXXXX"
            className="glass-input"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <FiGlobe className="inline mr-1" />
            Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://example.com"
            className="glass-input"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
