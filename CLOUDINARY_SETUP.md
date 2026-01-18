# Cloudinary Setup Guide

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. Once logged in, you'll be on your Dashboard

## Step 2: Get Your Cloud Name

1. On your Cloudinary Dashboard, you'll see your **Cloud name** at the top
2. Copy this cloud name

## Step 3: Create an Upload Preset (Unsigned)

1. In your Cloudinary Dashboard, go to **Settings** (gear icon)
2. Click on the **Upload** tab
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Configure the preset:
   - **Signing Mode**: Select **Unsigned** (important!)
   - **Preset name**: Give it a name (e.g., `event_corner_uploads`)
   - **Folder**: Optionally set a default folder (e.g., `event-corner`)
   - **Transformations**: Optionally add default transformations
6. Click **Save**
7. Copy the **preset name**

## Step 4: Update the Frontend Configuration

1. Open `frontend/src/utils/cloudinary.js`
2. Replace these values:

```javascript
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME'; // Replace with your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'; // Replace with your preset name
```

Example:
```javascript
const CLOUDINARY_CLOUD_NAME = 'my-cloud-123';
const CLOUDINARY_UPLOAD_PRESET = 'event_corner_uploads';
```

## Step 5: Test the Upload

The `ImageUploader` component is now ready to use in any profile page:

```jsx
import ImageUploader from '../components/ImageUploader';

// In your component:
<ImageUploader
  onUploadSuccess={(url) => {
    // URL is the Cloudinary URL of the uploaded image
    setProfile({ ...profile, profile_picture_url: url });
  }}
  currentImage={profile.profile_picture_url}
  folder="event-corner/profiles"
  label="Upload Profile Picture"
  type="profile"
/>
```

## Usage Examples

### Profile Picture Upload
```jsx
<ImageUploader
  onUploadSuccess={(url) => setProfile({ ...profile, profile_picture_url: url })}
  currentImage={profile.profile_picture_url}
  folder="event-corner/profiles"
  type="profile"
  label="Upload Profile Picture"
/>
```

### Banner Upload
```jsx
<ImageUploader
  onUploadSuccess={(url) => setProfile({ ...profile, banner_url: url })}
  currentImage={profile.banner_url}
  folder="event-corner/banners"
  type="banner"
  label="Upload Banner Image"
/>
```

## Features

- ✅ Direct upload to Cloudinary (no backend required)
- ✅ Image preview before upload
- ✅ File size validation (5MB max)
- ✅ File type validation (images only)
- ✅ Loading states
- ✅ Remove/replace uploaded images
- ✅ Toast notifications for success/error
- ✅ Responsive design

## Security Notes

- **Unsigned uploads** are used for convenience (no backend signatures required)
- Set up **upload constraints** in your Cloudinary preset:
  - Max file size
  - Allowed formats
  - Folder restrictions
  - Transformations

## Folder Structure in Cloudinary

Recommended folder structure:
```
event-corner/
  ├── profiles/       (profile pictures)
  ├── banners/        (banner images)
  └── events/         (event images)
```

## Troubleshooting

### Upload fails with CORS error
- Check that your upload preset is set to **Unsigned**
- Verify the cloud name and preset name are correct

### Images not showing
- Check the console for errors
- Verify the Cloudinary URL is correct
- Check browser network tab for failed requests

### Large file sizes
- Consider adding transformations in your upload preset
- Enable auto-optimization in Cloudinary settings
