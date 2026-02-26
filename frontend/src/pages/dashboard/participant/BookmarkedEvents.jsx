import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FiCalendar, FiMapPin, FiBookmark, FiExternalLink, FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';

const BookmarkedEvents = () => {
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchBookmarkedEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(API_ENDPOINTS.USER_BOOKMARKS(userData?.user_id));
      
      if (!response.ok) throw new Error('Failed to fetch bookmarked events');
      
      const result = await response.json();
      
      if (result.success) {
        setBookmarkedEvents(result.bookmarks || []);
      } else {
        setBookmarkedEvents([]);
      }
    } catch (error) {
      console.error('Error fetching bookmarked events:', error);
      toast.error('Failed to load bookmarked events');
      setBookmarkedEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userData?.user_id]);

  useEffect(() => {
    fetchBookmarkedEvents();
  }, [fetchBookmarkedEvents]);

  const removeBookmark = async (eventId) => {
    try {
      const response = await fetch(API_ENDPOINTS.BOOKMARK_TOGGLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData?.user_id,
          event_id: eventId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBookmarkedEvents(prev => prev.filter(event => event.event_id !== eventId));
        toast.success('Bookmark removed');
      } else {
        throw new Error(result.error || 'Failed to remove bookmark');
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getEventStartDate = (event) => {
    if (event.timeslots && event.timeslots.length > 0) {
      return event.timeslots[0].start;
    }
    return event.start_date || event.created_at;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookmarked events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bookmarked Events</h2>
          <p className="text-gray-600 mt-1">Your saved events for quick access</p>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <FiBookmark className="text-teal-600" size={20} />
          <span className="font-semibold">{bookmarkedEvents.length} Bookmarked</span>
        </div>
      </div>

      {/* Events List */}
      {bookmarkedEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <FiBookmark className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookmarked Events</h3>
          <p className="text-gray-600 mb-6">
            Start bookmarking events to save them for later!
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Explore Events
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookmarkedEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Event Image */}
                <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0">
                  {event.banner_url || event.thumbnail_url ? (
                    <img
                      src={event.banner_url || event.thumbnail_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <FiCalendar size={48} />
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {event.title}
                      </h3>
                      <div className="flex gap-2 mb-3">
                        {event.category && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                            {event.category}
                          </span>
                        )}
                        {event.visibility && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            {event.visibility}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(event.event_id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove bookmark"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiCalendar className="text-teal-600" />
                      <span className="text-sm">
                        {formatDate(getEventStartDate(event))}
                      </span>
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMapPin className="text-teal-600" />
                        <span className="text-sm">{event.venue_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/event/${event.event_id}`)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      <FiExternalLink size={16} />
                      View Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarkedEvents;
