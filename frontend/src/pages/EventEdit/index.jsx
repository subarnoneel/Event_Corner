import React, { useContext, useState, useEffect } from 'react';
import { MdOutlineEmojiEvents } from 'react-icons/md';
import { FiEdit } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from '../../providers/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { useEventForm } from '../EventAdd/hooks/useEventForm';
import BasicInfoSection from '../EventAdd/components/BasicInfoSection';
import MediaSection from '../EventAdd/components/MediaSection';
import ScheduleSection from '../EventAdd/components/ScheduleSection';
import LocationSection from '../EventAdd/components/LocationSection';
import ContactSection from '../EventAdd/components/ContactSection';
import VisibilitySection from '../EventAdd/components/VisibilitySection';
import AdditionalInfoSection from '../EventAdd/components/AdditionalInfoSection';
import { eventAddStyles } from '../EventAdd/styles';
import { TIMEZONES } from '../EventAdd/constants';

const EventEdit = () => {
  const { id } = useParams();
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    formData,
    setFormData,
    events,
    setEvents,
    newTag,
    setNewTag,
    additionalInfoFields,
    setAdditionalInfoFields,
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

  // Fetch event data on mount
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.EVENT_BY_ID(id));
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch event');
        }

        const event = result.event;

        // Check if user is the creator
        if (userData?.user_id !== event.created_by) {
          toast.error('You are not authorized to edit this event');
          navigate('/');
          return;
        }

        // Populate form data
        setFormData({
          title: event.title || '',
          description: event.description || '',
          category: event.category || '',
          tags: event.tags || [],
          bannerImage: event.banner_url || '',
          thumbnailImage: event.thumbnail_url || '',
          additionalImages: event.image_urls || [],
          contactEmail: event.contact_email || '',
          contactPhone: event.contact_phone || '',
          website: event.website_url || '',
          venueType: event.venue_type || 'physical',
          venueName: event.venue_name || '',
          venueAddress: event.venue_address || '',
          eventTimezone: event.event_timezone || 'Asia/Dhaka',
          venueLat: event.venue_lat || null,
          venueLng: event.venue_lng || null,
          googlePlaceId: event.google_place_id || '',
          venueCity: event.venue_city || '',
          venueState: event.venue_state || '',
          venueCountry: event.venue_country || '',
          visibility: event.visibility || 'public',
          requirements: event.requirements || '',
          status: event.status || 'draft'
        });

        // Populate timeslots
        if (event.timeslots && Array.isArray(event.timeslots)) {
          const timeslotEvents = event.timeslots.map((slot, idx) => ({
            id: slot.id || String(Date.now() + idx),
            title: slot.title,
            start: slot.start,
            end: slot.end,
            color: slot.color || '#3b82f6',
            description: slot.description || ''
          }));
          setEvents(timeslotEvents);
        }

        // Populate additional info fields
        if (event.additional_info && typeof event.additional_info === 'object') {
          const fields = Object.entries(event.additional_info).map(([key, value], idx) => ({
            id: String(Date.now() + idx),
            key,
            value: String(value)
          }));
          setAdditionalInfoFields(fields);
        }

        setIsLoading(false);
      } catch (error) {
        toast.error(error.message || 'Failed to load event data');
        console.error('Error fetching event:', error);
        navigate('/');
      }
    };

    if (userData) {
      fetchEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userData, navigate]);

  // Get timezone offset from TIMEZONES array
  const timezoneOffset = TIMEZONES.find(tz => tz.value === formData.eventTimezone)?.offset || '+06:00';

  const handlePublish = async () => {
    if (!formData.title || !formData.category) {
      toast.error('Please fill in all required fields before publishing');
      return;
    }

    setIsSubmitting(true);
    try {
      // First save any changes
      await updateEventData({ ...formData, status: 'active' }); // Or 'pending_approval' if logic requires
      toast.success("Event Published Successfully! 🎉");
      navigate(`/event/${id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const isDraft = formData.status === 'draft';
    
    setShowDeleteConfirm(false);
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(isDraft ? "Draft deleted successfully" : "Event deleted successfully");
        // Navigate to home page
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        throw new Error(result.error || "Failed to delete");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to delete event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEventData = async (dataToSubmit) => {
    // Convert additional info fields to JSONB object
    const additionalInfo = additionalInfoFields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim();
      }
      return acc;
    }, {});

    // Prepare timeslots for backend
    const timeslotsForBackend = events.map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      color: e.color,
      description: e.description || ''
    }));

    const eventData = {
      title: dataToSubmit.title,
      description: dataToSubmit.description,
      category: dataToSubmit.category,
      tags: dataToSubmit.tags,
      bannerImage: dataToSubmit.bannerImage,
      thumbnailImage: dataToSubmit.thumbnailImage,
      additionalImages: dataToSubmit.additionalImages,
      venueType: dataToSubmit.venueType,
      venueName: dataToSubmit.venueName,
      eventTimezone: dataToSubmit.eventTimezone,
      venueAddress: dataToSubmit.venueAddress,
      venueLat: dataToSubmit.venueLat,
      venueLng: dataToSubmit.venueLng,
      googlePlaceId: dataToSubmit.googlePlaceId,
      venueCity: dataToSubmit.venueCity,
      venueState: dataToSubmit.venueState,
      venueCountry: dataToSubmit.venueCountry,
      contactEmail: dataToSubmit.contactEmail,
      contactPhone: dataToSubmit.contactPhone,
      website: dataToSubmit.website,
      visibility: dataToSubmit.visibility,
      requirements: dataToSubmit.requirements,
      additional_info: additionalInfo,
      timeslots: timeslotsForBackend,
      // If explicitly passing status (e.g. for publish), use it. Otherwise, backend/DB preserves current status unless logic overrides? 
      // Actually, our backend update logic doesn't explicitly look for 'status' in body unless we add it.
      // Let's assume we need to pass status if we want to change it.
      // NOTE: The backend update route (as seen in server.js) DOES NOT seem to take 'status' from body. 
      // It only updates known fields. We might need to UPDATE backend again to accept status change.
      // Wait, I didn't verify if PUT /api/events/:id accepts status. 
      // Let me check server.js again... it DOES NOT. 
      // I will fix server.js in next step if generic update doesn't handle status.
      // For now, let's pass it. 
    };

    // FIX: server.js update endpoint logic is:
    //         title, description, ... visibility, requirements, additional_info
    // It DOES NOT extract 'status'. I need to update server.js to allow status update.

    // But first, let's assume I will fix server.js.
    if (dataToSubmit.status) {
      eventData.status = dataToSubmit.status; // Pass status if we want to change it (e.g. publish)
    }

    console.log('Updating event via helper:', eventData);

    const response = await fetch(API_ENDPOINTS.UPDATE_EVENT(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to update event');
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateEventData(formData); // Just update, don't change status (keep as draft or whatever it is)
      toast.success("Saved successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 event-add-page">
      <Toaster position="top-right" />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-fade-in">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {formData.status === 'draft' ? 'Delete Draft?' : 'Delete Event?'}
              </h3>
              <p className="text-gray-600">
                {formData.status === 'draft' 
                  ? "Are you sure you want to delete this draft? This action cannot be undone."
                  : "Are you sure you want to delete this event? This action cannot be undone and will remove the event permanently."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            <MdOutlineEmojiEvents className="inline mr-3 text-blue-600" />
            Edit Event
          </h1>
          <p className="text-slate-600">Update your event details below</p>
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

          <div className="flex gap-4 justify-between w-full mt-8 border-t pt-6">
            <div className="flex gap-4">
              {/* Delete Button - Available for all events */}
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-6 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {formData.status === 'draft' ? 'Delete Draft' : 'Delete Event'}
              </button>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(`/event/${id}`)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>

              {/* Save Draft / Update Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                {formData.status === 'draft' ? 'Save Draft' : 'Update Event'}
              </button>

              {/* Publish Button - Only for Drafts */}
              {formData.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => handlePublish()}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <MdOutlineEmojiEvents size={18} />
                  Publish Event
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <style jsx>{eventAddStyles}</style>
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EventEdit;
