# HR Management System

This repository contains a full-stack HR management application with JWT authentication, role-based access control, worker resume management, notifications, and offer letter generation with PDF preview and editing.

## Overview

The system is split into a Node.js/Express backend and a React frontend. CEO and HR users can manage workers, update resume information, generate offer letters, send broadcasts, and review notifications. Worker users can sign in and view their limited dashboard state.

The backend connects to MongoDB for user and resume data, uses RabbitMQ for notification broadcast delivery, and generates offer letter PDFs with `wkhtmltopdf`. If MongoDB is unavailable, the server can still start in degraded mode, but auth- and database-backed routes will return `503` until the database is restored.

## Core Features

- JWT-based login with protected routes on both the client and server
- Role-based access for CEO, HR, and Worker accounts
- Worker profile and resume management for privileged users
- Notification center with unread counts, read tracking, and broadcast messages
- Offer letter generation with PDF preview and download
- Advanced offer-letter editor with page management, paragraph editing, auto-rebalancing, and compile support
- Seed scripts for demo users and local development

## Application Flow

1. The user logs in through the React frontend.
2. The backend issues a JWT and the frontend stores the session state.
3. Protected routes expose different dashboard actions based on role.
4. CEO and HR users can:
   - load workers from MongoDB,
   - edit worker resume details,
   - open the offer-letter generator,
   - open the advanced editor,
   - send broadcast notifications to all members.
5. Workers can sign in and access their limited dashboard experience.
6. Notifications are fetched from the API and polled from the frontend every 30 seconds.

## Project Structure

```text
hr/
├── backend/
│   ├── constants/
│   │   └── roles.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── notificationController.js
│   │   ├── userController.js
│   │   └── wkhtmlOfferLetterController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── notificationModel.js
│   │   └── userModel.js
│   ├── public/
│   │   └── images/
│   │       └── offerletter/
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── offerLetterRoutes.js
│   │   └── userRoutes.js
│   ├── scripts/
│   │   └── seedUsers.js
│   ├── services/
│   │   ├── messaging/
│   │   │   ├── broadcastConsumer.js
│   │   │   ├── broadcastPublisher.js
│   │   │   ├── messageConsumer.js
│   │   │   ├── messagePublisher.js
│   │   │   ├── queueNames.js
│   │   │   └── rabbitmqConnection.js
│   │   ├── offerLetter/
│   │   │   ├── offerLetterDataBuilder.js
│   │   │   ├── offerLetterState.js
│   │   │   ├── pdfGenerator.js
│   │   │   ├── pdfLayout.js
│   │   │   ├── pdfPagination.js
│   │   │   └── pdfTemplateBuilder.js
│   │   └── seedDefaultUsers.js
│   ├── utils/
│   │   ├── dateFormatter.js
│   │   ├── htmlHelpers.js
│   │   └── sanitizeUser.js
│   ├── GeneratedOfferLetter/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── BroadcastModal.js
│   │   │   ├── NotificationBell.js
│   │   │   └── ProtectedRoute.js
│   │   ├── constants/
│   │   │   └── roles.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── modules/
│   │   │   └── OfferLetter/
│   │   │       ├── AdvancedEditor.js
│   │   │       ├── AdvancedEditor.css
│   │   │       ├── OfferLetter.js
│   │   │       └── OfferLetter.css
│   │   └── pages/
│   │       ├── DashboardPage.js
│   │       └── LoginPage.js
│   └── package.json
└── README.md
```

## Backend Details

The backend server is started from `backend/server.js`. It:

- loads environment variables with `dotenv`,
- enables CORS and JSON parsing,
- serves static assets from `backend/public`,
- exposes generated offer-letter files from `GeneratedOfferLetter/`,
- seeds default users after a successful MongoDB connection,
- starts the RabbitMQ broadcast consumer when available.

### Backend Routes

- `POST /api/auth/login` - authenticate a user and return a JWT
- `GET /api/users/me` - return the current user profile
- `GET /api/users/workers` - list worker accounts for CEO and HR
- `PATCH /api/users/workers/:id/resume` - update a worker resume
- `POST /api/offerletter/generate` - generate an offer letter PDF
- `GET /api/offerletter/data` - fetch the last offer-letter data set
- `POST /api/offerletter/compile` - compile edited pages into a PDF
- `POST /api/notifications/newNotification` - queue a notification
- `POST /api/notifications/broadcast` - broadcast a notification to all members
- `GET /api/notifications` - inspect stored notifications and queue metadata
- `GET /api/notifications/my` - fetch notifications for the current user
- `PATCH /api/notifications/read-all` - mark all user notifications as read
- `PATCH /api/notifications/:id/read` - mark one notification as read

### Backend Services

- `services/messaging/` handles RabbitMQ connections, queue names, consumers, and publishers.
- `services/offerLetter/` contains the PDF layout, pagination, template, and data-building logic.
- `utils/sanitizeUser.js` strips sensitive fields before sending user data to the frontend.

## Frontend Details

The frontend is a React application that uses `react-router-dom`, a shared API client, and an auth context for session handling.

### Frontend Routes

- `/` - redirects to the dashboard when authenticated, otherwise to login
- `/login` - sign-in page
- `/dashboard` - main dashboard, protected by authentication
- `/advanced-editor` - protected editor for CEO and HR users

### Main UI Areas

#### Login Page

- Sign-in form for demo and real accounts
- Fast login shortcuts for seeded users

#### Dashboard

- Header with role display, notification bell, and logout action
- Worker list for CEO and HR users
- Resume editor for the selected worker
- Offer letter generator panel
- Broadcast notification action for privileged users

#### Notification Center

- Shows unread counts in the header
- Loads the latest notifications from `/api/notifications/my`
- Supports marking a single notification or all notifications as read
- Displays priority, sender, and relative time

#### Offer Letter Generator

- Collects the candidate name, gender, job type, duration, role, dates, and salary
- Generates a PDF preview from the backend
- Opens the generated document in a new tab
- Can launch the advanced editor after generation

#### Advanced Editor

- Loads offer-letter page data from the backend
- Adds and deletes pages
- Adds, edits, and removes paragraphs
- Supports paragraph type changes
- Automatically rebalances content when pages overflow
- Compiles the edited result back into a PDF

## Requirements

- Node.js 18+ recommended
- npm
- MongoDB Atlas or a local MongoDB instance
- RabbitMQ if you want broadcast notifications to work end to end
- `wkhtmltopdf` installed on Windows or available on your PATH for PDF generation

## Local Setup

### 1. Backend

```bash
cd backend
npm install
```

Create or update `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=hr_management
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
BASE_URL=http://localhost:5000
WKHTMLTOPDF_PATH=C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe
OFFER_LETTER_OUTPUT_DIR=GeneratedOfferLetter
RABBITMQ_URL=amqp://127.0.0.1
RABBITMQ_QUEUE_NAME=hr.notifications
RABBITMQ_BROADCAST_EXCHANGE=hr.broadcast
RABBITMQ_PREFETCH=10
```

Start the backend:

```bash
npm start
```

Seed the demo users:

```bash
npm run seed:users
```

If MongoDB is unavailable, the server still starts, but auth, users, and other database-backed routes will not be available until the database reconnects.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and proxies API requests to `http://localhost:5000`.

## Demo Accounts

All seeded accounts use the same password:

`Password123!`

Seeded users:

- CEO: `ceo@hrsystem.local`
- HR: `hr@hrsystem.local`
- Worker: `worker@hrsystem.local`

Additional worker accounts:

- `aarav.patel@hrsystem.local`
- `meera.shah@hrsystem.local`
- `rohan.desai@hrsystem.local`
- `isha.mehta@hrsystem.local`
- `karan.joshi@hrsystem.local`

## Working Notes

- `backend/public/images/offerletter/` stores the static assets used by the PDF generator.
- `GeneratedOfferLetter/` stores generated PDFs and compiled output.
- The frontend API client lives in `frontend/src/api/client.js` and is used across the app.
- Notifications are polled from the client, so the UI updates even when WebSocket support is not present.

## Troubleshooting

### MongoDB connection errors

- Check `MONGODB_URI`
- Confirm your Atlas IP is whitelisted
- Verify `MONGODB_DB_NAME` matches the target database
- If MongoDB is offline, the backend enters degraded mode and database-backed endpoints will respond with `503`

### PDF generation errors

- Confirm `wkhtmltopdf` is installed
- Check that `WKHTMLTOPDF_PATH` is correct on Windows
- Verify the offer-letter template images exist in `backend/public/images/offerletter/`
- Make sure `BASE_URL` points to a reachable backend host

### Notification issues

- Confirm RabbitMQ is running
- Verify `RABBITMQ_URL` and `RABBITMQ_QUEUE_NAME`
- Check `RABBITMQ_BROADCAST_EXCHANGE` if broadcasts are not appearing

### Port already in use

- Another backend instance is probably already running on port `5000`
- Stop the existing process or change `PORT` in `.env`
