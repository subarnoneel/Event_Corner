import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../../config/api";
import ReactMarkdown from 'react-markdown';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiEye,
  FiArrowLeft,
  FiShare2,
  FiHeart,
  FiMail,
  FiPhone,
  FiGlobe,
  FiMonitor,
  FiVideo,
  FiMap,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [calendarView, setCalendarView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.EVENT_BY_ID(id));
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch event');
        }

        setEvent(data.event);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Calendar Helper Functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }

    return days;
  }, [currentDate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getVenueIcon = (venueType) => {
    switch (venueType) {
      case 'online':
        return <FiVideo className="text-blue-600" size={24} />;
      case 'hybrid':
        return <FiMonitor className="text-purple-600" size={24} />;
      default:
        return <FiMapPin className="text-green-600" size={24} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700 border-green-200', icon: FiCheckCircle, text: 'Active' },
      draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FiAlertCircle, text: 'Draft' },
      completed: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FiCheckCircle, text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-700 border-red-200', icon: FiAlertCircle, text: 'Cancelled' }
    };
    const badge = badges[status] || badges.active;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  const openGoogleMaps = () => {
    if (event.venue_lat && event.venue_lng) {
      window.open(`https://www.google.com/maps?q=${event.venue_lat},${event.venue_lng}`, '_blank');
    } else if (event.venue_address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address)}`, '_blank');
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get timeslots for a specific date
  const getTimeslotsForDate = (date) => {
    if (!event?.timeslots) return [];

    return event.timeslots.filter(slot => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(checkDate);
      nextDate.setDate(nextDate.getDate() + 1);

      return (slotStart >= checkDate && slotStart < nextDate) ||
        (slotEnd > checkDate && slotEnd <= nextDate) ||
        (slotStart < checkDate && slotEnd > nextDate);
    });
  };

  const allImages = [
    event.banner_url,
    event.thumbnail_url,
    ...(event.image_urls || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <FiArrowLeft size={20} />
              <span className="font-medium">Back to Events</span>
            </button>
            {event && getStatusBadge(event.status)}
          </div>
        </div>
      </div>

      {/* Banner Image with Gallery */}
      <div className="relative w-full h-[500px] bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
        {allImages.length > 0 ? (
          <>
            <img
              src={allImages[selectedImage]}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {/* Image Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded overflow-hidden border-2 transition ${selectedImage === idx ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-2">{event.title}</h1>
              <p className="text-xl opacity-90">{event.category}</p>
            </div>
          </div>
        )}

        {/* Share and Favorite Buttons */}
        <div className="absolute top-6 right-6 flex gap-3">
          <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition">
            <FiShare2 size={20} className="text-gray-700" />
          </button>
          <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition">
            <FiHeart size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Featured Badge */}
        {event.is_featured && (
          <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg">
            ⭐ Featured Event
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Basic Info */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-gray-900 flex-1">{event.title}</h1>
                <div className="flex items-center gap-2 text-gray-600 ml-4">
                  <FiEye size={18} />
                  <span className="text-sm font-medium">{event.view_count || 0} views</span>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold capitalize">
                  {event.category}
                </span>
              </div>

              {/* Venue Type & Location */}
              <div className="space-y-4 mb-6 pb-6 border-b">
                <div className="flex items-start gap-4">
                  {getVenueIcon(event.venue_type)}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 capitalize text-lg">{event.venue_type} Event</p>
                    {event.venue_name && (
                      <p className="text-gray-700 font-medium mt-1">{event.venue_name}</p>
                    )}
                    {event.venue_type !== 'online' && event.venue_address && (
                      <p className="text-gray-600 text-sm mt-1">{event.venue_address}</p>
                    )}
                    {event.venue_city && (
                      <p className="text-gray-600 text-sm">
                        {event.venue_city}{event.venue_state && `, ${event.venue_state}`}{event.venue_country && `, ${event.venue_country}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              {(event.contact_email || event.contact_phone || event.website_url) && (
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                  {event.contact_email && (
                    <div className="flex items-center gap-3">
                      <FiMail className="text-blue-600" size={20} />
                      <a href={`mailto:${event.contact_email}`} className="text-blue-600 hover:underline">
                        {event.contact_email}
                      </a>
                    </div>
                  )}
                  {event.contact_phone && (
                    <div className="flex items-center gap-3">
                      <FiPhone className="text-blue-600" size={20} />
                      <a href={`tel:${event.contact_phone}`} className="text-blue-600 hover:underline">
                        {event.contact_phone}
                      </a>
                    </div>
                  )}
                  {event.website_url && (
                    <div className="flex items-center gap-3">
                      <FiGlobe className="text-blue-600" size={20} />
                      <a href={event.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Timezone Info */}
              {event.event_timezone && (
                <div className="text-sm text-gray-600">
                  <FiClock className="inline mr-2" size={16} />
                  Timezone: <span className="font-medium">{event.event_timezone}</span>
                </div>
              )}
            </div>

            {/* Event Timeslots/Schedule */}
            {event.timeslots && event.timeslots.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Schedule</h2>

                {/* Calendar Navigation */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <FiChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <FiChevronRight size={20} />
                      </button>
                      <button
                        onClick={goToToday}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                      >
                        today
                      </button>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900">
                      {formatMonthYear(currentDate)}
                    </h3>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCalendarView('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${calendarView === 'month'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        month
                      </button>
                      <button
                        onClick={() => setCalendarView('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${calendarView === 'week'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        week
                      </button>
                      <button
                        onClick={() => setCalendarView('day')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${calendarView === 'day'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        day
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="border rounded-lg overflow-hidden">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 bg-gray-50 border-b">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-3 text-center font-semibold text-gray-700 text-sm">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Body */}
                    <div className="grid grid-cols-7">
                      {calendarDays.map((dayInfo, idx) => {
                        // Sort timeslots by length (longer events first) and start time
                        const timeslots = getTimeslotsForDate(dayInfo.date).sort((a, b) => {
                          const durationA = new Date(a.end) - new Date(a.start);
                          const durationB = new Date(b.end) - new Date(b.start);
                          return durationB - durationA || new Date(a.start) - new Date(b.start);
                        });

                        const isToday = new Date().toDateString() === dayInfo.date.toDateString();
                        const currentDayStart = new Date(dayInfo.date);
                        currentDayStart.setHours(0, 0, 0, 0);
                        const currentDayEnd = new Date(dayInfo.date);
                        currentDayEnd.setHours(23, 59, 59, 999);

                        return (
                          <div
                            key={idx}
                            className={`min-h-[100px] border-b border-r flex flex-col ${!dayInfo.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                              } ${isToday ? 'bg-blue-50' : ''}`}
                          >
                            <div className={`text-sm font-medium p-2 ${isToday ? 'text-blue-600 font-bold' : ''
                              }`}>
                              {dayInfo.day}
                            </div>

                            {/* Timeslots for this day */}
                            <div className="flex-1 flex flex-col gap-[2px] pb-1">
                              {timeslots.map((slot) => {
                                const startTime = new Date(slot.start);
                                const endTime = new Date(slot.end);

                                const isStart = startTime >= currentDayStart;
                                const isEnd = endTime <= currentDayEnd;

                                const formattedTime = startTime.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                });

                                return (
                                  <div
                                    key={slot.id}
                                    className={`
                                      text-xs font-medium truncate cursor-pointer hover:opacity-90 transition relative h-6 flex items-center
                                      ${isStart ? 'rounded-l px-2 ml-1' : 'rounded-l-none pl-2 -ml-[1px]'}
                                      ${isEnd ? 'rounded-r mr-1' : 'rounded-r-none -mr-[1px]'}
                                    `}
                                    style={{
                                      backgroundColor: slot.color || '#3b82f6',
                                      color: '#fff',
                                      width: isStart && isEnd ? 'calc(100% - 8px)' : 'auto'
                                    }}
                                    title={`${slot.title} - ${formattedTime}`}
                                  >
                                    {isStart && (
                                      <span className="truncate">
                                        {slot.title}
                                        <span className="opacity-75 ml-1 text-[10px] hidden lg:inline">
                                          {formattedTime}
                                        </span>
                                      </span>
                                    )}
                                    {!isStart && <span dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Added Timeslots List */}
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FiClock className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">
                      Added Timeslots ({event.timeslots.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {event.timeslots.map((slot, idx) => {
                      const startDate = new Date(slot.start);
                      const endDate = new Date(slot.end);
                      const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} → ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                      return (
                        <div
                          key={slot.id || idx}
                          className="border rounded-lg p-4 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: slot.color || '#3b82f6' }}
                                ></div>
                                <h4 className="font-bold text-gray-900">{slot.title}</h4>
                              </div>
                              <p className="text-sm text-gray-600">{dateRange}</p>
                              {slot.description && (
                                <p className="text-sm text-gray-500 mt-2">{slot.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </div>
            </div>

            {/* Requirements */}
            {event.requirements && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements & Prerequisites</h2>
                <div className="prose prose-lg max-w-none text-gray-700">
                  <ReactMarkdown>{event.requirements}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {event.additional_info && Object.keys(event.additional_info).length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional Information</h2>
                <div className="space-y-3">
                  {Object.entries(event.additional_info).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 capitalize font-medium">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium text-gray-900">{value?.toString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Registration Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Register for this event</h3>
                <div className="mb-6">
                  <p className="text-4xl font-bold text-orange-600">Free</p>
                  <p className="text-sm text-gray-600 mt-1">No registration fee</p>
                </div>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-md transform hover:scale-105">
                  Reserve a Spot
                </button>
                {event.visibility && (
                  <p className="text-xs text-gray-500 text-center mt-3 capitalize">
                    {event.visibility === 'public' ? '🌍 Open to everyone' :
                      event.visibility === 'private' ? '🔒 Private event' :
                        '🏛️ Institution only'}
                  </p>
                )}
              </div>

              {/* Quick Info Card */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
                <div className="space-y-4">
                  {/* Venue Type */}
                  <div className="flex items-start gap-3">
                    {getVenueIcon(event.venue_type)}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase">Event Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{event.venue_type}</p>
                    </div>
                  </div>

                  {/* Timeslots Summary */}
                  {event.timeslots && event.timeslots.length > 0 && (
                    <div className="flex items-start gap-3">
                      <FiCalendar className="text-purple-600 mt-1" size={20} />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase">Sessions</p>
                        <p className="font-semibold text-gray-900">{event.timeslots.length} scheduled session{event.timeslots.length > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(event.timeslots[0].start)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Views */}
                  <div className="flex items-start gap-3">
                    <FiEye className="text-indigo-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase">Interest</p>
                      <p className="font-semibold text-gray-900">{event.view_count || 0} views</p>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-start gap-3">
                    <FiClock className="text-gray-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase">Posted</p>
                      <p className="font-semibold text-gray-900">{formatDate(event.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Map */}
              {event.venue_type !== 'online' && (event.venue_address || event.venue_lat) && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FiMapPin className="text-green-600" />
                    Location
                  </h3>

                  {/* Map Preview - OpenStreetMap (No API key needed) */}
                  {event.venue_lat && event.venue_lng && (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden relative group cursor-pointer" onClick={openGoogleMaps}>
                      <img
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.venue_lng - 0.01},${event.venue_lat - 0.01},${event.venue_lng + 0.01},${event.venue_lat + 0.01}&layer=mapnik&marker=${event.venue_lat},${event.venue_lng}`}
                        alt="Event Location"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to a styled placeholder
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                              <svg class="w-12 h-12 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              </svg>
                              <p class="text-gray-600 text-sm font-medium">Click to view on map</p>
                              <p class="text-gray-500 text-xs mt-1">${event.venue_city || 'Location'}</p>
                            </div>
                          `;
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition">
                          Click to open in maps
                        </span>
                      </div>
                    </div>
                  )}

                  {event.venue_address && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900">{event.venue_name}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.venue_address}</p>
                    </div>
                  )}

                  <button
                    onClick={openGoogleMaps}
                    className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <FiMap size={18} />
                    View on Google Maps
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
