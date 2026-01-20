import React, { useState, useEffect } from "react";
import { useContext } from "react";
import AuthContext from "../providers/AuthContext";
import { API_ENDPOINTS } from "../config/api";
import { FiCalendar, FiMapPin, FiClock, FiEye } from 'react-icons/fi';

const ExploreEvents = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [filter, searchQuery]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append('category', filter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('status', 'active');
      params.append('visibility', 'public');
      params.append('limit', '100');
      
      const url = `${API_ENDPOINTS.EVENTS}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching events from:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(error.message);
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

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || event.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Explore Events</h1>
          <p className="text-gray-600">Discover and join exciting events happening around you</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Events
              </label>
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Filter Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="conference">Conference</option>
                <option value="competition">Competition</option>
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
                <option value="hackathon">Hackathon</option>
                <option value="networking">Networking</option>
                <option value="meetup">Meetup</option>
                <option value="webinar">Webinar</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing <span className="font-bold text-red-600">{events.length}</span> event{events.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">Error loading events: {error}</p>
            <button 
              onClick={fetchEvents}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Event Image */}
                <div className="h-48 bg-gradient-to-br from-red-400 to-red-600">
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
                  
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

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

                    {event.category && (
                      <div className="flex items-center text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 capitalize">
                          {event.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                    <FiEye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">
              {searchQuery || filter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "No events are currently available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreEvents;
