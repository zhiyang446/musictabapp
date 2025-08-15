# Music Tab App - Frontend

A modern web interface for the Music Tab App audio transcription service.

## Features

### 🎵 Core Functionality
- **User Management**: Create and manage user profiles
- **File Upload**: Upload audio files with drag-and-drop support
- **File Management**: View and manage uploaded audio files
- **Real-time Status**: Monitor API server and database connectivity
- **Responsive Design**: Works on desktop and mobile devices

### 🎨 User Interface
- **Modern Design**: Clean, gradient-based interface with glassmorphism effects
- **Interactive Elements**: Hover effects, animations, and smooth transitions
- **Toast Notifications**: Real-time feedback for user actions
- **Progress Indicators**: Visual feedback during file uploads
- **Status Monitoring**: Live API and database status indicators

## Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- Backend API server running on port 3001
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Starting the Frontend Server
```bash
# Start frontend only
npm run frontend:start

# Start both frontend and backend
npm run dev
```

The frontend will be available at: http://localhost:3000

### Testing the Frontend
```bash
# Test frontend server and functionality
npm run test-frontend

# Test DoD requirements
npm run test-frontend-dod
```

## File Structure

```
frontend/
├── index.html          # Main HTML page
├── styles.css          # CSS styles and responsive design
├── app.js              # JavaScript application logic
├── server.js           # Static file server
└── README.md           # This file
```

## User Guide

### 1. Creating a User Account
1. Enter your email address in the "User Profile" section
2. Optionally enter a display name
3. Click "Create User" button
4. Your user information will be saved locally

### 2. Uploading Audio Files
1. Ensure you have created a user account first
2. Click "Choose Audio File" in the upload section
3. Select an audio file (MP3, WAV, AAC, OGG, FLAC, M4A)
4. File information will be displayed
5. Click "Upload File" to start the upload
6. Monitor the progress bar during upload

### 3. Managing Files
1. View your uploaded files in the "Your Audio Files" section
2. Files show original name, size, type, and upload date
3. Click "Refresh" to update the file list
4. File count is displayed in the top-right corner

### 4. Monitoring System Status
- **API Server**: Shows if the backend is online/offline
- **Database**: Shows database connectivity status
- **Last Updated**: Timestamp of last status check

## Supported Audio Formats

- **MP3**: audio/mpeg, audio/mp3
- **WAV**: audio/wav, audio/wave, audio/x-wav
- **AAC**: audio/aac
- **OGG**: audio/ogg
- **FLAC**: audio/flac
- **M4A**: audio/m4a
- **MP4 Audio**: audio/mp4

## File Size Limits

- Maximum file size: 50MB per file
- Recommended size: Under 10MB for optimal performance

## Browser Compatibility

### Fully Supported
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- ES6+ JavaScript (Classes, async/await, fetch API)
- CSS Grid and Flexbox
- CSS Custom Properties (variables)
- FormData API for file uploads
- LocalStorage for user persistence

## API Integration

The frontend communicates with the backend API at `http://localhost:3001`:

### Endpoints Used
- `GET /health` - Check API server status
- `POST /api/users` - Create user accounts
- `GET /api/audio-files` - Retrieve user's audio files
- `POST /api/upload` - Upload audio files

### Error Handling
- Network errors are caught and displayed as toast notifications
- API errors show detailed error messages
- Offline status is indicated in the status section
- Failed uploads are automatically cleaned up

## Responsive Design

### Desktop (1200px+)
- Two-column grid layout
- Full-width file list section
- Large upload area with drag-and-drop

### Tablet (768px - 1199px)
- Single-column layout
- Optimized touch targets
- Responsive grid for status items

### Mobile (< 768px)
- Stacked layout
- Touch-friendly buttons
- Simplified navigation
- Optimized file list display

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Frontend only
npm run frontend:start
```

### Testing
```bash
# Test frontend functionality
npm run test-frontend

# Test DoD requirements
npm run test-frontend-dod

# Create test audio files
npm run create-test-audio
```

### Code Structure

#### HTML (index.html)
- Semantic HTML5 structure
- Accessibility-friendly markup
- Progressive enhancement approach

#### CSS (styles.css)
- Mobile-first responsive design
- CSS Grid and Flexbox layouts
- Custom properties for theming
- Smooth animations and transitions

#### JavaScript (app.js)
- ES6+ class-based architecture
- Async/await for API calls
- Event-driven user interactions
- Local storage for persistence

## Troubleshooting

### Common Issues

**Frontend not loading:**
- Check if frontend server is running on port 3000
- Verify all files exist in the frontend/ directory
- Check browser console for JavaScript errors

**API connection failed:**
- Ensure backend server is running on port 3001
- Check CORS settings in the API server
- Verify network connectivity

**File upload not working:**
- Check file format and size limits
- Ensure user account is created
- Verify backend upload endpoint is accessible

**Styles not loading:**
- Check if styles.css is accessible
- Verify CSS file path in HTML
- Check for CSS syntax errors

### Browser Console
Open browser developer tools (F12) to check for:
- JavaScript errors
- Network request failures
- Console log messages

## Performance

### Optimization Features
- CSS and JavaScript minification ready
- Image optimization (when images are added)
- Lazy loading for large file lists
- Efficient DOM manipulation
- Minimal external dependencies

### Monitoring
- Real-time API status checking
- Upload progress tracking
- Error logging and reporting
- Performance metrics in console

## Security

### Client-Side Security
- Input validation for email addresses
- File type and size validation
- XSS prevention through proper DOM manipulation
- HTTPS ready (when deployed with SSL)

### Data Handling
- User data stored locally only
- No sensitive information in localStorage
- Secure API communication
- Proper error message handling

## Future Enhancements

### Planned Features
- Drag-and-drop file upload
- Multiple file selection
- Upload queue management
- File preview capabilities
- Advanced file filtering
- User preferences storage
- Dark/light theme toggle
- Offline support with service workers

### Technical Improvements
- TypeScript migration
- Component-based architecture
- State management (Redux/Zustand)
- Unit and integration tests
- PWA capabilities
- Performance monitoring
