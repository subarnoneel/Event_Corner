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
    entryFee: '',
    bannerImage: '',
    thumbnailImage: '',
    additionalImages: [],
    contactEmail: '',
    contactPhone: '',
    website: '',
    venueType: 'physical',
    venueName: '',
    venueAddress: '',
    venueLat: null,
    venueLng: null,
    googlePlaceId: '',
    venueCity: '',
    venueState: '',
    venueCountry: '',
    visibility: 'public'
  });

  const [events, setEvents] = useState([]);
  const [newTag, setNewTag] = useState('');

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
      const imageUrl = await uploadToCloudinary(file);
      
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
      start: slotData.start,
      end: slotData.end,
      color: '#3b82f6'
    };
    setEvents([...events, newEvent]);
    toast.success('Timeslot added');
  };

  const removeTimeslot = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
    toast.success('Timeslot deleted');
  };

  const updateLocation = (locationData) => {
    setFormData(prev => ({
      ...prev,
      ...locationData
    }));
  };

  return {
    formData,
    setFormData,
    events,
    newTag,
    setNewTag,
    userTimezone,
    handleInputChange,
    handleImageUpload,
    removeAdditionalImage,
    handleAddTag,
    removeTag,
    addTimeslot,
    removeTimeslot,
    updateLocation
  };
};
