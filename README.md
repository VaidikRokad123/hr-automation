# HR Management System

A full-stack HR management application with modular architecture for various HR functions.

## Project Structure

```
.
├── frontend/          # React frontend application
│   └── src/
│       ├── modules/   # HR modules
│       │   └── OfferLetter/  # Offer letter generation module
│       ├── App.js     # Main HR dashboard
│       └── index.js
├── backend/           # Node.js/Express backend API
│   ├── controllers/
│   │   └── offerLetterController.js
│   ├── routes/
│   │   └── offerLetterRoutes.js
│   └── public/
│       └── images/
│           └── offerletter/  # Offer letter template images
└── README.md
```

## Current Modules

- ✅ **Offer Letter Generator** - Generate internship/job offer letters in PDF format

## Future Modules

- 🔜 Attendance Management
- 🔜 Leave Management
- 🔜 Payroll Processing
- 🔜 Performance Reviews
- 🔜 Employee Onboarding

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create the images directory and copy images:
```bash
mkdir -p public/images/offerletter
```

Copy the following images from `frontend/src/` to `backend/public/images/offerletter/`:
- temp.png
- sign2.png
- transparent.png

Or use the automated script from the root directory:
- **Windows**: `setup-backend-images.bat`
- **Linux/Mac**: `./setup-backend-images.sh`

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## How It Works

1. **Frontend**: React application with modular HR components
   - Main dashboard (`App.js`) for navigation between modules
   - Individual modules for each HR function (e.g., `OfferLetter`)
   
2. **Backend**: Express API with organized controllers and routes
   - Separate controllers for each HR module
   - RESTful API endpoints
   - Server-side PDF generation using jsPDF

3. **Communication**: Frontend sends requests to backend API, receives responses

## API Endpoints

### Offer Letter Module

**POST** `/api/offerletter/generate`

**Request Body:**
```json
{
  "name": "John Doe",
  "gender": "male",
  "internType": "internship",
  "durationType": "month",
  "duration": "6",
  "role": "Software Developer",
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "salaryType": "paid",
  "salaryAmount": "15000"
}
```

**Response:** PDF file (application/pdf)

## Features

- ✅ Modular frontend architecture for easy expansion
- ✅ Separate backend controllers for each HR function
- ✅ RESTful API design
- ✅ Justified text alignment in PDFs
- ✅ Dynamic content based on form inputs
- ✅ Support for internship, part-time, and full-time positions
- ✅ Paid/unpaid salary options
- ✅ Automatic date formatting with ordinal suffixes
- ✅ Multi-page PDF support
- ✅ Professional UI with navigation

## Technologies Used

### Frontend
- React
- Axios
- CSS (modular styling)

### Backend
- Node.js
- Express
- jsPDF
- CORS

## Development

For development with auto-reload on the backend:
```bash
cd backend
npm run dev
```

## Adding New HR Modules

### Frontend
1. Create a new folder in `frontend/src/modules/` (e.g., `Attendance`)
2. Create component files (e.g., `Attendance.js`, `Attendance.css`)
3. Import and add to `App.js` navigation

### Backend
1. Create a new controller in `backend/controllers/` (e.g., `attendanceController.js`)
2. Create a new route file in `backend/routes/` (e.g., `attendanceRoutes.js`)
3. Register the route in `backend/server.js`

## Notes

- Make sure both frontend and backend are running simultaneously
- The frontend proxy is configured to forward API requests to `http://localhost:5000`
- Images must be present in `backend/public/images/offerletter/` for offer letter generation to work
- Each HR module is self-contained and can be developed independently
