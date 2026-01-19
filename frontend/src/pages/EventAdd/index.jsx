import React, { useContext, useState } from 'react';
import { MdOutlineEmojiEvents } from 'react-icons/md';
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
import { eventAddStyles } from './styles';

const EventAdd = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    updateLocation,
    handleAddInfoField,
    handleRemoveInfoField,
    handleInfoFieldChange
  } = useEventForm();

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

    console.log('Form Data:', formData);
    console.log('Timeslots:', events);
    console.log('Timezone:', userTimezone);
    console.log('Additional Info:', additionalInfo);

    setIsSubmitting(false);

    // try {
    //   const response = await fetch(API_ENDPOINTS.EVENTS, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${user.token}`
    //     },
    //     body: JSON.stringify({
    //       ...formData,
    //       timeslots: events,
    //       timezone: userTimezone,
    //       additional_info: additionalInfo
    //     })
    //   });

    //   if (!response.ok) throw new Error('Failed to create event');

    //   toast.success('Event created successfully!');
    //   navigate('/dashboard/organizer');
    // } catch (error) {
    //   toast.error(error.message || 'Failed to create event');
    //   console.error(error);
    // } finally {
    //   setIsSubmitting(false);
    // }
  };

  return (
    <div className="min-h-screen p-6 event-add-page">
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            <MdOutlineEmojiEvents className="inline mr-3 text-blue-600" />
            Create New Event
          </h1>
          <p className="text-slate-600">Fill in the details below to create your event</p>
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
            userTimezone={userTimezone}
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
