import React, { useContext, useState } from 'react';
import { MdOutlineEmojiEvents } from 'react-icons/md';
import { FiEdit, FiZap } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../providers/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { useEventForm } from './hooks/useEventForm';
import BasicInfoSection from './components/BasicInfoSection';
import MediaSection from './components/MediaSection';
import ScheduleSection from './components/ScheduleSection';
import LocationSection from './components/LocationSection';
import ContactSection from './components/ContactSection';
import VisibilitySection from './components/VisibilitySection';
import AdditionalInfoSection from './components/AdditionalInfoSection';
import BannerAnalyzer from './components/BannerAnalyzer';
import { eventAddStyles } from './styles';
import { TIMEZONES } from './constants';

const EventAdd = () => {
  const { user, userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBannerAnalyzer, setShowBannerAnalyzer] = useState(false);

  const {
    formData,
    setFormData,
    events,
    newTag,
    setNewTag,
    userTimezone,
    additionalInfoFields,
    handleInputChange,
    handleImageUpload,
    removeAdditionalImage,
    handleAddTag,
    removeTag,
    addTimeslot,
    removeTimeslot,
    updateTimeslot,
    updateLocation,
    handleAddInfoField,
    handleRemoveInfoField,
    handleInfoFieldChange
  } = useEventForm();

  // Get timezone offset from TIMEZONES array
  const timezoneOffset = TIMEZONES.find(tz => tz.value === formData.eventTimezone)?.offset || '+06:00';

  const handleAIDataExtracted = (aiData) => {
    // Merge AI extracted data with form data
    setFormData(prev => ({
      ...prev,
      title: aiData.title || prev.title,
      description: aiData.description || prev.description,
      category: aiData.category || prev.category,
      tags: aiData.tags && aiData.tags.length > 0 ? aiData.tags : prev.tags,
      venueName: aiData.venue_name || prev.venueName,
      venueAddress: aiData.venue_address || prev.venueAddress,
      contactEmail: aiData.contact_email || prev.contactEmail,
      contactPhone: aiData.contact_phone || prev.contactPhone,
      entryFee: aiData.entry_fee || prev.entryFee,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Convert additional info fields to JSONB object
    const additionalInfo = additionalInfoFields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim();
      }
      return acc;
    }, {});

    // Prepare timeslots for backend (remove frontend-only id field)
    const timeslotsForBackend = events.map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      color: e.color,
      description: '' // Optional field
    }));

    console.log('=== EVENT CREATION DEBUG ===');
    console.log('Raw events from state:', events);
    console.log('Timeslots for backend:', timeslotsForBackend);
    console.log('Timezone offset being used:', timezoneOffset);
    console.log('Selected Event Timezone:', formData.eventTimezone);
    console.log('User Data:', userData);
    console.log('User ID (UUID):', userData?.id);
    console.log('===========================');

    // Validate user ID is available
    // if (!userData?.user_id) {
    //   toast.error('User authentication error. Please refresh and try again.');
    //   setIsSubmitting(false);
    //   return;
    // }

    try {
      // Map frontend field names to backend parameter names
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        bannerImage: formData.bannerImage,
        thumbnailImage: formData.thumbnailImage,
        additionalImages: formData.additionalImages,
        venueType: formData.venueType,
        venueName: formData.venueName,
        eventTimezone: formData.eventTimezone,
        venueAddress: formData.venueAddress,
        venueLat: formData.venueLat,
        venueLng: formData.venueLng,
        googlePlaceId: formData.googlePlaceId,
        venueCity: formData.venueCity,
        venueState: formData.venueState,
        venueCountry: formData.venueCountry,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        website: formData.website,
        visibility: formData.visibility,
        requirements: formData.requirements,
        additional_info: additionalInfo,
        timeslots: timeslotsForBackend,
        created_by: userData.user_id, // Backend expects user_id field
        institution_id: userData.institution_id || null // If user is organizer under institution
      };

      console.log('Event Data being sent:', eventData);

      const response = await fetch(API_ENDPOINTS.EVENTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create event');
      }

      toast.success('Event created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to create event');
      console.error('Event creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 event-add-page">
      <Toaster position="top-right" />

      {showBannerAnalyzer && (
        <BannerAnalyzer
          onDataExtracted={handleAIDataExtracted}
          onClose={() => setShowBannerAnalyzer(false)}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            <MdOutlineEmojiEvents className="inline mr-3 text-blue-600" />
            Create New Event
          </h1>
          <p className="text-slate-600">Fill in the details below to create your event</p>
        </div>

        {/* Mode Selector */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Choose Creation Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setShowBannerAnalyzer(true)}
              className="p-6 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                  <FiZap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">AI-Assisted Creation</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Upload your event banner and let AI extract the details automatically
                  </p>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Powered by BLIP-2
                  </span>
                </div>
              </div>
            </button>

            <div className="p-6 border-2 border-slate-300 bg-white rounded-xl text-left">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-200 rounded-lg text-slate-600">
                  <FiEdit size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">Manual Entry</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Fill out the form below manually with all event details
                  </p>
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                    Traditional Method
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <BasicInfoSection
            formData={formData}
            handleInputChange={handleInputChange}
            newTag={newTag}
            setNewTag={setNewTag}
            handleAddTag={handleAddTag}
            removeTag={removeTag}
          />

          <MediaSection
            formData={formData}
            setFormData={setFormData}
            handleImageUpload={handleImageUpload}
            removeAdditionalImage={removeAdditionalImage}
          />

          <ScheduleSection
            formData={formData}
            handleInputChange={handleInputChange}
            events={events}
            addTimeslot={addTimeslot}
            removeTimeslot={removeTimeslot}
            updateTimeslot={updateTimeslot}
            userTimezone={formData.eventTimezone}
            timezoneOffset={timezoneOffset}
          />

          <LocationSection
            formData={formData}
            handleInputChange={handleInputChange}
            updateLocation={updateLocation}
          />

          <ContactSection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <VisibilitySection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <AdditionalInfoSection
            formData={formData}
            handleInputChange={handleInputChange}
            additionalInfoFields={additionalInfoFields}
            handleAddInfoField={handleAddInfoField}
            handleRemoveInfoField={handleRemoveInfoField}
            handleInfoFieldChange={handleInfoFieldChange}
          />

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{eventAddStyles}</style>
    </div>
  );
};

export default EventAdd;
