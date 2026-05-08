# HR Management System

A full-stack HR management application for generating offer letters with an advanced PDF editor.

## Features

- **Offer Letter Generator**: Create professional internship/job offer letters
- **Advanced PDF Editor**: Edit content, manage pages, insert variables dynamically
- **Real-time Preview**: See PDF changes instantly
- **Multi-page Support**: Automatic pagination with smart content distribution
- **Variable System**: Insert dynamic data like name, dates, salary, etc.
- **Professional Templates**: Pre-designed letterhead with company branding

## Project Structure

```
hr/
├── frontend/              # React application
│   ├── src/
│   │   ├── modules/
│   │   │   └── OfferLetter/
│   │   │       ├── OfferLetter.js        # Main form
│   │   │       ├── AdvancedEditor.js     # PDF editor
│   │   │       ├── OfferLetter.css
│   │   │       └── AdvancedEditor.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── backend/               # Express API
│   ├── controllers/
│   │   └── wkhtmlOfferLetterController.js  # PDF generation logic
│   ├── routes/
│   │   └── offerLetterRoutes.js
│   ├── public/
│   │   └── images/
│   │       └── offerletter/
│   │           ├── temp.jpg/png          # Letterhead template
│   │           ├── sign2.png             # Signature image
│   │           └── transparent.png       # Overlay (optional)
│   ├── GeneratedOfferLetter/             # Output PDFs
│   ├── server.js
│   └── package.json
│
└── README.md              # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- wkhtmltopdf installed on your system

### Installing wkhtmltopdf

**Windows:**
1. Download from: https://wkhtmltopdf.org/downloads.html
2. Install to: `C:\Program Files\wkhtmltopdf\`
3. The path is already configured in the controller

**Linux:**
```bash
sudo apt-get install wkhtmltopdf
```

**macOS:**
```bash
brew install wkhtmltopdf
```

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Ensure images exist in public/images/offerletter/
# Required files: temp.jpg or temp.png, sign2.png

# Start the server
npm start
```

Backend runs on: `http://localhost:5000`

For development with auto-reload:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

Frontend runs on: `http://localhost:3000`

## Usage

### Generating an Offer Letter

1. Open `http://localhost:3000` in your browser
2. Fill in the form:
   - Name
   - Gender (Male/Female)
   - Job Type (Internship/Part Time/Full Time)
   - Duration Type (Month/Year)
   - Duration (number)
   - Role
   - Start Date & End Date
   - Salary Type (Paid/Unpaid)
   - Salary Amount (if paid)
3. Click **Generate Offer Letter**
4. Preview appears on the right side

### Using the Advanced Editor

1. After generating a letter, click **Advanced Edit**
2. Features available:
   - **Page Management**: Add/delete pages, switch between pages
   - **Content Editing**: Edit any paragraph, change types (date, subject, paragraph, etc.)
   - **Reorder Content**: Move paragraphs up/down
   - **Add Images**: Upload and insert images
   - **Insert Variables**: Click in a text field, then click a variable button to insert
   - **Compile PDF**: Generate updated PDF with your changes
   - **Download**: Open PDF in new tab for download

### Available Variables

Click in a text field first, then click these buttons to insert:
- `${name}` - Candidate name
- `${upperName}` - Name in uppercase
- `${gender}` - Gender
- `${internType}` - Job type (internship/part time/full time)
- `${durationType}` - Duration type (month/year)
- `${duration}` - Duration number
- `${role}` - Job role
- `${startDate}` - Formatted start date
- `${endDate}` - Formatted end date
- `${salaryType}` - Paid/unpaid
- `${salaryAmount}` - Salary amount
- `${date}` - Current date

## API Endpoints

### Generate Offer Letter
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
  "startDate": "2026-01-01",
  "endDate": "2026-06-30",
  "salaryType": "paid",
  "salaryAmount": "15000"
}
```

**Response:**
```json
{
  "message": "Offer letter generated successfully",
  "path": "http://localhost:5000/GeneratedOfferLetter/internship_Letter_JOHN_DOE_1234567890.pdf",
  "data": {
    "metadata": { ... },
    "pages": [ ... ]
  }
}
```

### Get Offer Letter Data
**GET** `/api/offerletter/data`

Returns the last generated offer letter data for editing.

### Compile Offer Letter
**POST** `/api/offerletter/compile`

**Request Body:**
```json
{
  "pages": [ ... ],
  "metadata": { ... }
}
```

Regenerates PDF with edited content.

## Technologies Used

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **wkhtmltopdf** - PDF generation
- **CORS** - Cross-origin support

## Configuration

### Backend Port
Default: `5000`
Change in `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5000;
```

### Frontend Proxy
Configured in `frontend/package.json`:
```json
"proxy": "http://localhost:5000"
```

### wkhtmltopdf Path (Windows)
Set in `backend/controllers/wkhtmlOfferLetterController.js`:
```javascript
wkhtml.command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';
```

## Troubleshooting

### PDF Generation Fails
- Ensure wkhtmltopdf is installed and path is correct
- Check that images exist in `backend/public/images/offerletter/`
- Verify file permissions on `GeneratedOfferLetter` folder

### Variables Not Inserting
- Click in the text field first to set cursor position
- Ensure you're on the correct page
- Check browser console for errors

### Extra Blank Pages
- This has been optimized in the latest version
- Spacing and pagination logic automatically handles content distribution

### Port Already in Use
```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

## Development

### Adding New Features

**Frontend:**
1. Create components in `frontend/src/modules/OfferLetter/`
2. Update routing in `App.js`
3. Add styles in corresponding CSS files

**Backend:**
1. Add functions to `wkhtmlOfferLetterController.js`
2. Create routes in `offerLetterRoutes.js`
3. Register in `server.js`

### Code Structure

**PDF Generation Flow:**
1. User submits form → Frontend sends POST request
2. Backend receives data → Creates structured page data
3. `repaginateForFooterSafety()` → Optimizes content distribution
4. HTML template generated with CSS styling
5. wkhtmltopdf converts HTML → PDF
6. PDF saved and URL returned to frontend

## Future Enhancements

- 🔜 Multiple templates support
- 🔜 Bulk generation from CSV/Excel
- 🔜 Email integration
- 🔜 Digital signature support
- 🔜 Version history
- 🔜 Custom branding options
- 🔜 Export to Word format

## License

This project is for internal use.

## Support

For issues or questions, contact the development team.
