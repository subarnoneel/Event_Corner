# Event Creation API - Implementation Complete ✅

## Overview
The complete event creation flow has been implemented from frontend to backend to database.

---

## Backend API Endpoints

### 1. **POST /api/events** - Create Event
**Purpose:** Create a new event with timeslots

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string",
  "category": "string (required)",
  "tags": ["string"],
  "bannerImage": "string (URL)",
  "thumbnailImage": "string (URL)",
  "additionalImages": ["string (URLs)"],
  "venueType": "physical|online|hybrid (required)",
  "venueName": "string",
  "eventTimezone": "string (IANA timezone)",
  "venueAddress": "string",
  "venueLat": "number",
  "venueLng": "number",
  "googlePlaceId": "string",
  "venueCity": "string",
  "venueState": "string",
  "venueCountry": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "website": "string",
  "visibility": "public|private|institution_only",
  "requirements": "string (markdown)",
  "additional_info": "object (JSONB)",
  "timeslots": [
    {
      "title": "string",
      "start": "ISO 8601 with timezone",
      "end": "ISO 8601 with timezone",
      "color": "string (hex)",
      "description": "string"
    }
  ],
  "created_by": "UUID (required)",
  "institution_id": "UUID (optional)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "event_id": "UUID"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

### 2. **GET /api/events/:eventId** - Get Event Details
**Purpose:** Retrieve a single event with all details including timeslots

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "UUID",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "banner_url": "string",
    "thumbnail_url": "string",
    "image_urls": ["string"],
    "venue_type": "string",
    "venue_name": "string",
    "event_timezone": "string",
    "venue_address": "string",
    "venue_lat": "number",
    "venue_lng": "number",
    "google_place_id": "string",
    "venue_city": "string",
    "venue_state": "string",
    "venue_country": "string",
    "created_by": "UUID",
    "institution_id": "UUID",
    "status": "string",
    "visibility": "string",
    "is_featured": "boolean",
    "contact_email": "string",
    "contact_phone": "string",
    "website_url": "string",
    "requirements": "string",
    "additional_info": "object",
    "view_count": "number",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "timeslots": [
      {
        "id": "UUID",
        "title": "string",
        "description": "string",
        "start": "ISO 8601",
        "end": "ISO 8601",
        "color": "string"
      }
    ]
  }
}
```

---

### 3. **GET /api/events** - List Events
**Purpose:** Get all events with filters and pagination

**Query Parameters:**
- `category` - Filter by event category
- `visibility` - Filter by visibility (public/private/institution_only)
- `status` - Filter by status (default: active)
- `created_by` - Filter by creator UUID
- `institution_id` - Filter by institution UUID
- `search` - Search in title and description
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "UUID",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "banner_url": "string",
      "thumbnail_url": "string",
      "venue_type": "string",
      "venue_name": "string",
      "venue_address": "string",
      "created_by": "UUID",
      "institution_id": "UUID",
      "status": "string",
      "visibility": "string",
      "is_featured": "boolean",
      "view_count": "number",
      "created_at": "timestamp",
      "timeslot_count": "number"
    }
  ],
  "count": "number"
}
```

---

## Frontend Implementation

### API Configuration (`api.js`)
```javascript
export const API_ENDPOINTS = {
  EVENTS: `${API_BASE_URL}/api/events`,
  EVENT_BY_ID: (eventId) => `${API_BASE_URL}/api/events/${eventId}`,
  UPDATE_EVENT: (eventId) => `${API_BASE_URL}/api/events/${eventId}`,
  DELETE_EVENT: (eventId) => `${API_BASE_URL}/api/events/${eventId}`,
};
```

### Event Creation Flow (`index.jsx`)

**1. Form Data Collection:**
- Basic Info (title, description, category, tags)
- Media (banner, thumbnail, additional images)
- Schedule (timezone, timeslots)
- Location (venue type, address, coordinates)
- Contact (email, phone, website)
- Visibility & Requirements
- Additional Info (custom fields)

**2. Data Transformation:**
```javascript
// Timeslots: Remove frontend-only ID, keep ISO strings
const timeslotsForBackend = events.map(e => ({
  title: e.title,
  start: e.start,  // "2025-12-17T10:27:00+08:00"
  end: e.end,      // "2025-12-17T12:27:00+08:00"
  color: e.color,
  description: ''
}));

// Additional Info: Convert array to object
const additionalInfo = additionalInfoFields.reduce((acc, field) => {
  if (field.key.trim() && field.value.trim()) {
    acc[field.key.trim()] = field.value.trim();
  }
  return acc;
}, {});
```

**3. API Request:**
```javascript
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
  created_by: user.uid,
  institution_id: user.institution_id || null
};

const response = await fetch(API_ENDPOINTS.EVENTS, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(eventData)
});
```

---

## Database Layer

### Stored Procedure: `create_event_with_timeslots`

**Parameters (27 total):**
- Event metadata (title, description, category, tags)
- Media URLs (banner, thumbnail, images array)
- Location data (type, name, timezone, address, coordinates, place ID, city, state, country)
- Ownership (created_by, institution_id)
- Settings (status, visibility)
- Contact info (email, phone, website)
- Content (requirements, additional_info JSONB)
- Timeslots (JSONB array)

**Process:**
1. Insert event record → returns UUID
2. Loop through timeslots JSONB array
3. Insert each timeslot with event_id reference
4. Cast ISO strings to `TIMESTAMP WITH TIME ZONE`
5. Return success with event_id

**Transaction Safety:**
- Wrapped in exception handler
- Returns `{event_id, success, message}` on success
- Returns `{NULL, false, error_message}` on failure
- Cascading deletes configured for timeslots

---

## Field Mapping (Frontend → Backend → Database)

| Frontend | Backend Body | Database Parameter | Database Column |
|----------|-------------|-------------------|-----------------|
| title | title | p_title | title |
| description | description | p_description | description |
| category | category | p_category | category |
| tags | tags | p_tags | tags |
| bannerImage | bannerImage | p_banner_url | banner_url |
| thumbnailImage | thumbnailImage | p_thumbnail_url | thumbnail_url |
| additionalImages | additionalImages | p_image_urls | image_urls |
| venueType | venueType | p_venue_type | venue_type |
| venueName | venueName | p_venue_name | venue_name |
| eventTimezone | eventTimezone | p_event_timezone | event_timezone |
| venueAddress | venueAddress | p_venue_address | venue_address |
| venueLat | venueLat | p_venue_lat | venue_lat |
| venueLng | venueLng | p_venue_lng | venue_lng |
| googlePlaceId | googlePlaceId | p_google_place_id | google_place_id |
| venueCity | venueCity | p_venue_city | venue_city |
| venueState | venueState | p_venue_state | venue_state |
| venueCountry | venueCountry | p_venue_country | venue_country |
| contactEmail | contactEmail | p_contact_email | contact_email |
| contactPhone | contactPhone | p_contact_phone | contact_phone |
| website | website | p_website_url | website_url |
| visibility | visibility | p_visibility | visibility |
| requirements | requirements | p_requirements | requirements |
| additional_info | additional_info | p_additional_info | additional_info |
| user.uid | created_by | p_created_by | created_by |
| user.institution_id | institution_id | p_institution_id | institution_id |

---

## Validation

### Frontend Validation
✅ Required fields: title, category, venueType
✅ Timeslot validation: title, start, end required
✅ Email format validation
✅ URL format validation

### Backend Validation
✅ Required fields check
✅ created_by presence validation
✅ Database constraint validation (venue_type enum)
✅ Timeslot constraint: end_time > start_time

### Database Constraints
✅ NOT NULL constraints on critical fields
✅ CHECK constraint: venue_type IN ('physical', 'online', 'hybrid')
✅ CHECK constraint: end_time > start_time (timeslots)
✅ Foreign key constraints with CASCADE deletes
✅ UNIQUE constraints on registration/bookmark tables

---

## Testing Checklist

### ✅ Complete Flow Test
1. Fill out event form with all sections
2. Add multiple timeslots with different timezones
3. Upload images (banner, thumbnail, additional)
4. Add custom additional info fields
5. Submit form
6. Verify success message
7. Check database for:
   - Event record created
   - Timeslots inserted with correct timezone
   - JSONB fields properly formatted

### ✅ Edge Cases
- Empty timeslots array
- Missing optional fields (nulls handled)
- Online vs Physical venue types
- Different timezones (Asia/Dhaka, America/New_York, Europe/London, etc.)
- Long descriptions with markdown
- Multiple tags and images

### ✅ Error Handling
- Missing required fields
- Invalid timezone format
- Database connection errors
- Invalid UUIDs
- Constraint violations

---

## Status: PRODUCTION READY ✅

All components of the event creation flow are implemented and tested:
- ✅ Frontend form with validation
- ✅ API endpoint configuration
- ✅ Backend Express routes
- ✅ Database stored procedures
- ✅ Field mapping and data transformation
- ✅ Error handling
- ✅ Timezone support
- ✅ Transaction safety

The system is ready for event creation by organizers and institutions!
