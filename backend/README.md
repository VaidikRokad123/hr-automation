# Backend API for HR Management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the images from frontend/src to backend/public/images/offerletter:
   - temp.png
   - sign2.png
   - transparent.png

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Offer Letter

#### POST /api/offerletter/generate

Generate an offer letter PDF.

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

**Response:**
- PDF file download

## Project Structure

```
backend/
├── controllers/
│   └── offerLetterController.js    # Offer letter PDF generation logic
├── routes/
│   └── offerLetterRoutes.js        # Offer letter API routes
├── public/
│   └── images/
│       └── offerletter/            # Offer letter template images
├── server.js                       # Express server
└── package.json
```

## Future HR Modules

This backend is structured to support multiple HR functions:
- ✅ Offer Letter Generation
- 🔜 Employee Onboarding
- 🔜 Leave Management
- 🔜 Payroll Processing
- 🔜 Performance Reviews
- 🔜 Attendance Tracking

## Environment

- Port: 5000 (default)
