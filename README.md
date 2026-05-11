# HR Management System

A full-stack HR management application with JWT authentication, role-based access, worker resume management, and offer letter generation.

## What It Does

- CEO, HR, and Worker login with token-based auth
- Role-based dashboard access
- Worker resume viewing and editing for CEO/HR users
- Offer letter generation and PDF preview
- Advanced offer letter editor with page management and live compilation
- MongoDB-backed user records with seeded demo accounts

## Project Structure

```text
hr/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   └── ProtectedRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   └── DashboardPage.js
│   │   └── modules/
│   │       └── OfferLetter/
│   │           ├── OfferLetter.js
│   │           ├── AdvancedEditor.js
│   │           ├── OfferLetter.css
│   │           └── AdvancedEditor.css
│   └── package.json
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── wkhtmlOfferLetterController.js
│   ├── constants/
│   │   └── roles.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   └── userModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── offerLetterRoutes.js
│   ├── services/
│   │   ├── seedDefaultUsers.js
│   │   └── offerLetter/
│   │       ├── offerLetterDataBuilder.js
│   │       ├── offerLetterState.js
│   │       ├── pdfGenerator.js
│   │       ├── pdfLayout.js
│   │       ├── pdfPagination.js
│   │       └── pdfTemplateBuilder.js
│   ├── utils/
│   │   ├── dateFormatter.js
│   │   ├── htmlHelpers.js
│   │   └── sanitizeUser.js
│   ├── public/
│   │   └── images/
│   │       └── offerletter/
│   ├── GeneratedOfferLetter/
│   ├── scripts/
│   │   └── seedUsers.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

## Requirements

- Node.js 18+ recommended
- npm
- MongoDB Atlas or a local MongoDB instance
- wkhtmltopdf installed on Windows if you want PDF generation to work

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create or update `backend/.env` with these values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=hr_management
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
BASE_URL=http://localhost:5000
WKHTMLTOPDF_PATH=C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe
```

Run the backend:

```bash
npm start
```

Seed the demo users:

```bash
npm run seed:users
```

The backend starts in degraded mode if MongoDB is unavailable, but auth and worker endpoints need the database to be connected.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

## Demo Accounts

Password for all seeded accounts: `Password123!`

- CEO: `ceo@hrsystem.local`
- HR: `hr@hrsystem.local`
- Worker: `worker@hrsystem.local`
- Dummy workers:
  - `aarav.patel@hrsystem.local`
  - `meera.shah@hrsystem.local`
  - `rohan.desai@hrsystem.local`
  - `isha.mehta@hrsystem.local`
  - `karan.joshi@hrsystem.local`

## Main Screens

### Login

- Simple formal login page
- Quick buttons for demo accounts
- Token-based sign in

### Dashboard

- Two-column desktop layout
- Workers panel
- Resume Manager panel
- Offer Letter Tools panel
- CEO/HR can edit worker resumes
- Worker users get a limited dashboard view

### Offer Letter Generator

- Form for name, gender, job type, duration, role, dates, and salary
- Generates PDF and shows preview
- Can open the advanced editor after generating a letter

### Advanced Editor

- Page list and content editor
- Variable insertion
- Split/rebalance tools
- PDF compile and download
- Live page capacity indicator

## API Endpoints

### Auth

- `POST /api/auth/login` - sign in and return JWT

### Users

- `GET /api/users/me` - current user profile
- `GET /api/users/workers` - list workers for CEO/HR
- `PATCH /api/users/workers/:id/resume` - update worker resume data

### Offer Letters

- `POST /api/offerletter/generate` - generate a new offer letter PDF
- `GET /api/offerletter/data` - get the last offer letter data
- `POST /api/offerletter/compile` - compile edited offer letter pages into a PDF

## Notes

- `backend/public/images/offerletter/` should contain the base template and signature images used by the PDF generator.
- `GeneratedOfferLetter/` stores generated PDFs.
- The frontend uses `frontend/src/api/client.js` for API requests and auth tokens.
- The dashboard and offer-letter layouts were simplified to a more formal style and now use cleaner panel spacing.

## Troubleshooting

### MongoDB connection errors

- Check `MONGODB_URI`
- Confirm your Atlas IP is whitelisted
- If MongoDB is down, the backend may still start, but database-backed routes will return `503`

### PDF generation errors

- Confirm `wkhtmltopdf` is installed
- Confirm `WKHTMLTOPDF_PATH` is correct on Windows
- Make sure the offer-letter images exist in `backend/public/images/offerletter/`

### Port already in use

- Another backend instance is probably already running on port `5000`
- Stop the existing process or change `PORT` in `.env`
