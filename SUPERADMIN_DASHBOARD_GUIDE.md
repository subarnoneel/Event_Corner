# Superadmin Dashboard Setup Guide

## Overview
The Superadmin Dashboard is now fully implemented with a left sidebar navigation menu and three main modules. This guide explains how to access and use the dashboard.

## File Structure

```
frontend/src/
├── pages/
│   ├── superadmin.jsx          # Main dashboard with left sidebar
│   ├── Home.jsx                # Updated with Admin Dashboard link
│   ├── Login.jsx
│   └── Register.jsx
├── components/
│   ├── SuperadminProfile.jsx   # Profile management component
│   ├── InstitutionManagement.jsx # Institution verification component
│   ├── RoleAssignment.jsx      # Role assignment component
│   ├── MainLayout.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
├── routes/
│   └── PublicRoutes.jsx        # Updated with /superadmin route
├── config/
│   └── api.js                  # API configuration
└── providers/
    └── AuthContext.jsx         # Auth context (for user info)
```

## Features

### 1. **Left Sidebar Menu**
- Profile Dashboard
- Manage Institutions
- Assign Roles
- Toggle collapse/expand sidebar
- User info display
- Logout button

### 2. **Profile Dashboard**
- View superadmin profile information
- Edit profile details:
  - Full name
  - Username
  - Institution
  - Profile picture URL
  - Banner image URL
- Save changes with validation

### 3. **Manage Institutions**
- View all institutions
- Filter by status (All, Verified, Unverified)
- Sort by Name or Date
- Search institutions
- Multi-select institutions
- Verify/Unverify institutions
- Pagination (10 items per page)

### 4. **Assign Roles**
- Search users by name, email, or username
- Filter by user type (Student, Organizer)
- View current user roles
- Assign new roles
- Remove existing roles
- Real-time updates

## Access the Dashboard

### Step 1: Login
1. Go to the Home page
2. Click on "Login" in the navbar
3. Enter your credentials

### Step 2: Navigate to Admin Dashboard
After logging in, on the Home page you'll see two buttons:
- "Find Your Event" - Regular user feature
- "Admin Dashboard" - Superadmin feature

Click on "Admin Dashboard" or navigate to `/superadmin`

## Component Details

### SuperadminProfile.jsx
- Fetches user profile from `/api/superadmin/profile/:user_id`
- Updates profile via `PUT /api/superadmin/profile/:user_id`
- Edit mode toggle
- Form validation

### InstitutionManagement.jsx
- Fetches institutions from `/api/superadmin/institutions`
- Verifies institutions via `PATCH /api/superadmin/institutions/:id/verify`
- Supports filtering, sorting, and searching
- Multi-select with bulk operations ready
- Pagination support

### RoleAssignment.jsx
- Searches users via `/api/superadmin/users/search`
- Fetches available roles from `/api/superadmin/roles`
- Gets user roles from `/api/superadmin/users/:user_id/roles`
- Assigns roles via `POST /api/superadmin/users/:user_id/assign-role`
- Removes roles via `DELETE /api/superadmin/users/:user_id/roles/:role_id`

## Sidebar Navigation

The sidebar includes:
- **Collapsible** - Click the menu icon to collapse/expand
- **Active Tab Indicator** - Current section is highlighted
- **User Info** - Shows logged-in user email
- **Logout Button** - Exit superadmin dashboard

When collapsed, sidebar shows only icons with tooltips on hover.

## Styling

All components use:
- **TailwindCSS** for utility-first styling
- **DaisyUI** for UI components
- **React Icons (FiXxx)** for icons
- **React Hot Toast** for notifications

Color scheme:
- Primary: Blue (#3B82F6)
- Success: Green (#16A34A)
- Warning: Yellow (#FCD34D)
- Danger: Red (#DC2626)

## API Endpoints Required

The following endpoints should be available in your backend:

```javascript
// Profile
GET    /api/superadmin/profile/:user_id
PUT    /api/superadmin/profile/:user_id

// Institutions
GET    /api/superadmin/institutions
PATCH  /api/superadmin/institutions/:id/verify

// Users
GET    /api/superadmin/users/search
GET    /api/superadmin/users/:user_id/roles
POST   /api/superadmin/users/:user_id/assign-role
DELETE /api/superadmin/users/:user_id/roles/:role_id

// Roles
GET    /api/superadmin/roles
```

## Authentication

- Uses React Context (AuthContext) for user authentication
- User info is available globally
- Logout redirects to login page

## Next Steps

1. **Set up backend API endpoints** if not already done
2. **Configure database** with users, roles, and institutions
3. **Test each feature** in development mode
4. **Add role-based access control** - restrict dashboard to superadmins only
5. **Implement data validation** in backend
6. **Add error handling** for edge cases

## Development

Run the frontend in development mode:
```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173/superadmin`

## Browser Support

- Chrome/Chromium (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## Notes

- The dashboard assumes user authentication via Firebase/AuthContext
- API responses should follow the expected JSON format
- Images (profile picture, banner) should be valid URLs
- All dates are displayed in local format
