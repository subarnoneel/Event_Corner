# Event Corner Backend

Backend service for Event Corner application built with Node.js, Express, and Supabase.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=5000
NODE_ENV=development
```

You can find your Supabase URL and ANON KEY in your Supabase project settings.

### 3. Create Database Tables in Supabase

In your Supabase dashboard, create an `events` table with the following schema:

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/test-db` - Test database connection
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event

## Request/Response Examples

### Create Event
```json
POST /api/events
{
  "title": "Summer Concert",
  "description": "A fun outdoor concert",
  "date": "2025-06-15T19:00:00Z",
  "location": "Central Park"
}
```

## CORS Configuration

CORS is enabled for all origins by default. Modify in `server.js` if needed:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
```

## Project Structure

```
backend/
├── server.js           # Main server file
├── package.json        # Dependencies
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore rules
└── README.md           # This file
```
