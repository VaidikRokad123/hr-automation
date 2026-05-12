# HR Management System

A full-stack HR workflow app with a Node.js/Express backend and a React frontend. The system covers authentication, role-based dashboards, worker management, notifications, offer-letter generation, and secure contract review and acceptance.

## What the app does

This repository is organized around two main user experiences:

- A privileged HR/CEO workspace for generating offer letters, drafting contracts, browsing workers, and broadcasting notifications.
- A worker-facing contract acceptance flow that uses a public contract link, OTP verification, page-by-page review, and electronic acceptance capture.

The backend stores users, contracts, notifications, and acceptance data in MongoDB. It also serves generated offer-letter files and can start a RabbitMQ broadcast consumer when messaging is available. If MongoDB is down, the server still starts in degraded mode, but database-backed APIs return `503` until the database is reachable again.

## Tech Stack

- Backend: Node.js, Express, Mongoose, JWT, Helmet, CORS, cookie-parser, express-rate-limit
- Frontend: React, React Router, Axios, Create React App
- Messaging: RabbitMQ via `amqplib`
- Email: Nodemailer
- Document generation: `wkhtmltopdf`

## Repository Layout

```text
hr/
|-- backend/
|   |-- constants/
|   |-- controllers/
|   |   |-- authController.js
|   |   |-- contractController.js
|   |   |-- notificationController.js
|   |   |-- userController.js
|   |   `-- wkhtmlOfferLetterController.js
|   |-- middleware/
|   |-- models/
|   |   |-- acceptanceAuditModel.js
|   |   |-- contractInvitationModel.js
|   |   |-- contractModel.js
|   |   |-- notificationModel.js
|   |   `-- userModel.js
|   |-- public/
|   |   `-- images/offerletter/
|   |-- routes/
|   |   |-- authRoutes.js
|   |   |-- contractRoutes.js
|   |   |-- notificationRoutes.js
|   |   |-- offerLetterRoutes.js
|   |   `-- userRoutes.js
|   |-- scripts/
|   |   `-- seedUsers.js
|   |-- services/
|   |   |-- messaging/
|   |   |-- offerLetter/
|   |   |-- contractEmailService.js
|   |   |-- contractOtpService.js
|   |   `-- seedDefaultUsers.js
|   |-- utils/
|   `-- server.js
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- constants/
|   |   |-- context/
|   |   |-- modules/
|   |   |-- pages/
|   |   `-- utils/
|   `-- package.json
|-- package.json
`-- README.md
```

## Backend Overview

The backend entry point is [backend/server.js](backend/server.js). It loads environment variables, configures common middleware, connects to MongoDB, seeds default users, and starts the HTTP server.

### Startup behavior

- `helmet` adds security headers.
- `cors` is configured to allow the frontend origin from `FRONTEND_URL`.
- `cookie-parser` and JSON body parsing are enabled.
- Static assets are served from `backend/public`.
- Generated offer-letter files are served from `/GeneratedOfferLetter`.
- The RabbitMQ broadcast consumer starts after a successful MongoDB connection, but failure is non-fatal.
- If MongoDB is not available, the app still boots and reports degraded mode.

### Backend routes

Authentication and users:

- `POST /api/auth/login` - authenticate a user and return a JWT
- `GET /api/users/me` - return the current user profile
- `GET /api/users/workers` - list worker accounts for CEO and HR users
- `PATCH /api/users/workers/:id/resume` - update worker resume data

Offer letters:

- `POST /api/offerletter/generate` - generate an offer-letter PDF
- `GET /api/offerletter/data` - fetch the latest offer-letter data set
- `POST /api/offerletter/compile` - compile edited pages into a PDF

Contracts:

- `POST /api/contracts/template` - build a contract template from selected worker data
- `POST /api/contracts/send` - create and send an encrypted contract invitation
- `POST /api/contracts/session/exchange` - exchange a public contract token for a short-lived pre-session
- `POST /api/contracts/session/resend-otp` - resend the OTP for the current contract pre-session
- `POST /api/contracts/session/verify-otp` - verify the OTP and unlock contract review
- `GET /api/contracts/current/data` - load the current contract review payload
- `POST /api/contracts/current/accept` - accept the contract and store signed acceptance evidence

Notifications:

- `POST /api/notifications/newNotification` - create a notification for privileged users
- `GET /api/notifications` - inspect stored notifications and queue metadata
- `POST /api/notifications/broadcast` - broadcast a notification to members
- `GET /api/notifications/my` - fetch notifications for the current user
- `PATCH /api/notifications/read-all` - mark all notifications as read
- `PATCH /api/notifications/:id/read` - mark one notification as read

### Backend security and contract handling

- Contract payloads are encrypted before storage.
- Contract invitation links contain a public token and secret, but only a hash of the secret is stored.
- Public contract access is rate limited.
- OTP values are hashed before storage and expire after the configured OTP window.
- The contract review flow uses HTTP-only cookies for the pre-session and the review session.
- Accepted contracts store the worker name, IP address, user agent, timestamp, and signed audit evidence.

## Frontend Overview

The frontend is a React application with React Router, a shared Axios client, and an auth context for session state.

The top-level routes are defined in [frontend/src/App.js](frontend/src/App.js):

- `/` - redirects to the dashboard when signed in, otherwise to login
- `/login` - sign-in page
- `/dashboard` - authenticated dashboard
- `/offer-letter` - protected offer-letter generator for CEO and HR
- `/advanced-editor` - protected advanced editor for CEO and HR
- `/accept-contract/:token` - public entry point for contract recipients
- `/accept-contract/review` - public contract review page after token exchange

### Dashboard experience

The dashboard in [frontend/src/pages/DashboardPage.js](frontend/src/pages/DashboardPage.js) acts as the main workspace after login.

- It shows the current user name and role.
- It exposes navigation actions that change based on role.
- Privileged users can open the worker picker and generate a contract for a selected worker.
- Privileged users can open the broadcast modal and send notifications.
- All users can open the notification center and log out.

### Offer-letter flow

The offer-letter page in [frontend/src/pages/OfferLetterPage.js](frontend/src/pages/OfferLetterPage.js) wraps the offer-letter module and provides a back button to the dashboard.

The offer-letter module supports:

- collecting candidate details
- generating a PDF preview from the backend
- opening the generated document in a new tab
- launching the advanced editor after generation

### Advanced editor

The advanced editor in [frontend/src/modules/OfferLetter/AdvancedEditor.js](frontend/src/modules/OfferLetter/AdvancedEditor.js) is used for offer letters and contract drafting.

It supports:

- loading backend offer-letter page data
- creating and deleting pages
- adding and editing paragraphs
- moving, splitting, and removing content blocks
- changing paragraph types
- uploading images
- auto-rebalancing content across pages when the document overflows
- compiling the edited pages back into a PDF
- switching into contract mode to generate a worker-specific contract draft

### Contract acceptance flow

The contract acceptance experience in [frontend/src/pages/ContractAcceptancePage.js](frontend/src/pages/ContractAcceptancePage.js) is designed for recipients, not internal users.

The flow works like this:

1. The recipient opens a public link such as `/accept-contract/:token`.
2. The frontend exchanges the token for a short-lived pre-session.
3. The recipient verifies a 6-digit OTP sent to their registered email.
4. After verification, the app loads the review view.
5. The recipient must review every page in the contract.
6. The recipient confirms electronic delivery consent, agreement consent, and typed full name.
7. The acceptance payload is posted to the backend, which stores the signed result and audit evidence.

The review screen also shows page progress, uses a contract viewer module, and blocks acceptance until all required checks are complete.

## Local Setup

### Prerequisites

- Node.js 18 or later
- npm
- MongoDB Atlas or a local MongoDB instance
- RabbitMQ if you want broadcasts to be consumed end to end
- SMTP credentials if you want real email delivery for contract invites and OTPs
- `wkhtmltopdf` installed or available on the PATH for PDF generation

### Install dependencies

From the repository root:

```bash
npm install
```

Then install the app packages:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Backend environment

Create `backend/.env` with values similar to the following:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/hr_management
MONGODB_DB_NAME=hr_management

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

BASE_URL=http://localhost:5000
WKHTMLTOPDF_PATH=C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe
OFFER_LETTER_OUTPUT_DIR=GeneratedOfferLetter

RABBITMQ_URL=amqp://127.0.0.1
RABBITMQ_QUEUE_NAME=hr.notifications
RABBITMQ_BROADCAST_EXCHANGE=hr.broadcast
RABBITMQ_PREFETCH=10

CONTRACT_MASTER_KEY=base64-encoded-32-byte-key
CONTRACT_SESSION_SECRET=replace-with-a-session-secret
CONTRACT_LINK_EXPIRY_DAYS=7
TOKEN_PEPPER=replace-with-token-pepper
OTP_PEPPER=replace-with-otp-pepper
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
CONTRACT_SESSION_EXPIRY_MINUTES=30

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-password
SMTP_FROM=no-reply@example.com
```

Optional acceptance signing settings can also be provided if your deployment uses signed audit evidence keys.

### Run the backend

```bash
cd backend
npm start
```

For development with automatic reload:

```bash
cd backend
npm run dev
```

### Seed demo users

```bash
cd backend
npm run seed:users
```

### Run the frontend

```bash
cd frontend
npm start
```

The frontend runs on `http://localhost:3000` and proxies API requests to `http://localhost:5000`.

## Demo Accounts

All seeded accounts use the same password:

`Password123!`

Seeded users include:

- CEO: `ceo@hrsystem.local`
- HR: `hr@hrsystem.local`
- Worker: `worker@hrsystem.local`

Additional worker accounts used for testing and contract generation:

- `aarav.patel@hrsystem.local`
- `meera.shah@hrsystem.local`
- `rohan.desai@hrsystem.local`
- `isha.mehta@hrsystem.local`
- `karan.joshi@hrsystem.local`

## Working Notes

- [backend/public/images/offerletter/](backend/public/images/offerletter/) stores the static image assets used by the PDF templates.
- [backend/GeneratedOfferLetter/](backend/GeneratedOfferLetter/) stores generated PDFs and compiled output.
- [frontend/src/api/client.js](frontend/src/api/client.js) is the shared API client used across the React app.
- Notifications are polled from the client, so the UI stays updated without requiring WebSocket support.
- If SMTP is not configured, contract invitation and OTP delivery fall back to backend console output in development.
- `CONTRACT_MASTER_KEY` should be a base64-encoded 32-byte value in production.

## Troubleshooting

### MongoDB connection issues

- Confirm `MONGODB_URI` is correct.
- Check that the Atlas IP allowlist includes your machine if you are using MongoDB Atlas.
- Verify `MONGODB_DB_NAME` matches the target database name.
- If MongoDB is unavailable, the backend still starts, but database-backed routes respond with `503`.

### PDF generation issues

- Confirm `wkhtmltopdf` is installed.
- Check that `WKHTMLTOPDF_PATH` points to the correct executable on Windows.
- Make sure the offer-letter assets exist under [backend/public/images/offerletter/](backend/public/images/offerletter/).
- Verify `BASE_URL` points to a reachable backend host.

### Contract email or OTP issues

- Confirm `FRONTEND_URL` matches the frontend host used by recipients.
- Check `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- If SMTP is disabled, inspect the backend console for the generated link or OTP message.
- Confirm the OTP has not expired and the resend limit has not been exceeded.
- In production, HTTPS is required for secure cookies to work as expected.

### Contract acceptance issues

- The typed name must match the worker name, ignoring case and extra spacing.
- Every contract page must be viewed before the accept button is enabled.
- Both consent checkboxes are required.
- Expired, revoked, consumed, or already accepted invitations cannot be reused.

### Notification issues

- Confirm RabbitMQ is running.
- Verify `RABBITMQ_URL` and `RABBITMQ_QUEUE_NAME`.
- Check `RABBITMQ_BROADCAST_EXCHANGE` if broadcasts are not appearing.

### Port already in use

- Another backend instance is probably already running on port `5000`.
- Stop the existing process or change `PORT` in `backend/.env`.

## Quick Start

If you already have dependencies installed and environment variables configured:

```bash
cd backend
npm start
```

In a second terminal:

```bash
cd frontend
npm start
```

Then sign in with one of the seeded accounts and open the dashboard.
