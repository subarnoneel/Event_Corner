import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import { FiCalendar, FiMapPin, FiClock, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';

const MyEvents = () => {
  const { user, userData } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyEvents();
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters - fetch events by created_by (user id)
      const params = new URLSearchParams();
      if (user.uid) {
        params.append('created_by', user.uid);
      }
      params.append('limit', '100'); // Fetch more events
      
      const url = `${API_ENDPOINTS.EVENTS}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching events from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token || user.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Check if the response has the events array
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Error loading events: {error}</p>
        <button 
          onClick={fetchMyEvents}
          className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
          <p className="text-gray-600 mt-1">Events you have created</p>
        </div>
        <div className="text-sm text-gray-600">
          Total Events: <span className="font-bold text-purple-600">{events.length}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCalendar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-6">You haven't created any events yet.</p>
          <a 
            href="/events/create" 
            className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
          >
            Create Your First Event
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div 
              key={event.event_id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              {/* Event Image */}
              <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600">
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
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {event.title || 'Untitled Event'}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FiClock className="mr-2 flex-shrink-0" size={16} />
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                  
                  {event.venue_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FiMapPin className="mr-2 flex-shrink-0" size={16} />
                      <span className="line-clamp-1">{event.venue_name}</span>
                    </div>
                  )}

                  {event.status && (
                    <div className="flex items-center text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : event.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                    <FiEye size={16} />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                    <FiEdit size={16} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;
