import { useState } from 'react';
import { toast } from 'react-hot-toast';
import moment from 'moment-timezone';
import { uploadToCloudinary } from '../../../utils/cloudinary';

export const useEventForm = () => {
  const userTimezone = moment.tz.guess();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    bannerImage: '',
    thumbnailImage: '',
    additionalImages: [],
    contactEmail: '',
    contactPhone: '',
    website: '',
    venueType: 'physical',
    venueName: '',
    venueAddress: '',
    eventTimezone: 'Asia/Dhaka',
    venueLat: null,
    venueLng: null,
    googlePlaceId: '',
    venueCity: '',
    venueState: '',
    venueCountry: '',
    visibility: 'public',
    requirements: ''
  });

  const [events, setEvents] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [additionalInfoFields, setAdditionalInfoFields] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const uploadingToast = toast.loading(`Uploading ${type}...`);

    try {
      const result = await uploadToCloudinary(file);
      const imageUrl = result.url; // Extract URL from the result object
      
      if (type === 'banner') {
        setFormData(prev => ({ ...prev, bannerImage: imageUrl }));
      } else if (type === 'thumbnail') {
        setFormData(prev => ({ ...prev, thumbnailImage: imageUrl }));
      } else if (type === 'additional') {
        setFormData(prev => ({
          ...prev,
          additionalImages: [...prev.additionalImages, imageUrl]
        }));
      }

      toast.success(`${type} uploaded successfully!`, { id: uploadingToast });
    } catch (error) {
      toast.error(`Failed to upload ${type}`, { id: uploadingToast });
      console.error(error);
    }
  };

  const removeAdditionalImage = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
    toast.success('Image removed');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addTimeslot = (slotData) => {
    const newEvent = {
      id: String(Date.now()),
      title: slotData.title,
      start: slotData.start, // Already in ISO format with timezone from TimeslotModal
      end: slotData.end,     // Already in ISO format with timezone from TimeslotModal
      color: '#3b82f6'
    };
    setEvents([...events, newEvent]);
    toast.success('Timeslot added');
  };

  const removeTimeslot = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
    toast.success('Timeslot deleted');
  };

  const updateTimeslot = (eventId, updates) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, ...updates }
        : event
    ));
    toast.success('Timeslot updated');
  };

  const updateLocation = (locationData) => {
    setFormData(prev => ({
      ...prev,
      ...locationData
    }));
  };

  // Additional Info handlers
  const handleAddInfoField = () => {
    const newField = {
      id: String(Date.now()),
      key: '',
      value: ''
    };
    setAdditionalInfoFields([...additionalInfoFields, newField]);
  };

  const handleRemoveInfoField = (fieldId) => {
    setAdditionalInfoFields(additionalInfoFields.filter(field => field.id !== fieldId));
    toast.success('Field removed');
  };

  const handleInfoFieldChange = (fieldId, fieldType, value) => {
    setAdditionalInfoFields(additionalInfoFields.map(field => 
      field.id === fieldId 
        ? { ...field, [fieldType]: value }
        : field
    ));
  };

  return {
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
  };
};
