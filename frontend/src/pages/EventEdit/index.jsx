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
          requirements: event.requirements || ''
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

    // Prepare timeslots for backend
    const timeslotsForBackend = events.map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      color: e.color,
      description: e.description || ''
    }));

    try {
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
        timeslots: timeslotsForBackend
      };

      console.log('Updating event with data:', eventData);

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

      toast.success('Event updated successfully!');
      navigate(`/event/${id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update event');
      console.error('Event update error:', error);
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

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate(`/event/${id}`)}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <FiEdit size={18} />
              {isSubmitting ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{eventAddStyles}</style>
    </div>
  );
};

export default EventEdit;
