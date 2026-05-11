# HR Management System

A full-stack HR management application for generating offer letters with an advanced PDF editor.

## Features

- **Offer Letter Generator**: Create professional internship/job offer letters
- **Advanced PDF Editor**: Edit content, manage pages, insert variables dynamically
- **Real-time Preview**: See PDF changes instantly with embedded viewer
- **Smart Pagination**: Automatic content rebalancing across pages with overflow detection
- **Variable System**: Insert dynamic data like name, dates, salary, etc.
- **Professional Templates**: Pre-designed letterhead with company branding
- **Content Type Support**: Date, recipient, subject, paragraph, signature, company, separator, footer, and image blocks
- **Image Upload**: Add images directly into offer letters
- **Split & Merge**: Split paragraphs by newlines or paste multiple paragraphs at once
- **Page Capacity Indicator**: Visual feedback showing page fullness and overflow warnings

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
   - **Page Management**: Add/delete pages, switch between pages, view paragraph count per page
   - **Content Editing**: Edit any paragraph, change types (date, subject, paragraph, signature, company, separator, footer)
   - **Reorder Content**: Move paragraphs up/down within a page
   - **Add Images**: Upload and insert images (automatically sized to 55mm height)
   - **Insert Variables**: Click in a text field first, then click a variable button to insert at cursor position
   - **Split Paragraphs**: Use the ✂️ button to split paragraphs by newlines
   - **Paste Multiple Paragraphs**: Paste text with double newlines to automatically create separate paragraphs
   - **Rebalance Pages**: Manually trigger content redistribution across pages (⚖️ button)
   - **Auto-Rebalancing**: Automatic page rebalancing when content exceeds 110% capacity
   - **Page Capacity Indicator**: Real-time visual feedback showing page fullness (green: OK, yellow: near full, red: overflow)
   - **Compile PDF**: Generate updated PDF with your changes
   - **Download**: Open PDF in new tab for download
   - **Notifications**: Toast notifications for all actions (added, deleted, split, rebalanced, etc.)

### Available Variables

**Important**: Click in a text field first to set cursor position, then click these buttons to insert:
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

Variables are inserted at the cursor position and can be mixed with regular text.

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
- On Windows, verify path: `C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe`

### Variables Not Inserting
- **Must click in the text field first** to set cursor position
- Ensure you're on the correct page (variables only insert on current page)
- Check browser console for errors
- Notification will appear: "Please click in a text field first" if no field is selected

### Page Overflow Issues
- Watch the page capacity indicator (shows percentage and mm used)
- Red "⚠️ Page Overflow!" means content exceeds safe zone
- Click "⚖️ Rebalance Pages" to automatically redistribute content
- Auto-rebalancing triggers at 110% capacity
- Safe content height: 239mm per page (297mm - 30mm top - 28mm bottom)

### Content Not Splitting
- Use double newlines (`\n\n`) when pasting to auto-split paragraphs
- Use the ✂️ split button to manually split by newlines
- Single newlines within a paragraph are preserved

### Images Not Displaying
- Supported formats: JPG, PNG, GIF, WebP
- Images are automatically sized to 55mm height
- Check browser console for base64 encoding errors

### Port Already in Use
```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### PDF Preview Not Updating
- Click "🔨 Compile PDF" to regenerate
- Preview uses iframe with timestamp query parameter to force reload
- Check browser console for compilation errors

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

**Advanced Editor Flow:**
1. Editor fetches structured data from `/api/offerletter/data`
2. User edits content → Real-time height calculation using DOM measurement
3. Page capacity indicator shows fullness (green/yellow/red)
4. Auto-rebalancing triggers at 110% capacity
5. Manual rebalance redistributes all content across optimal pages
6. Compile sends updated structure to `/api/offerletter/compile`
7. Backend regenerates PDF → Returns new URL with timestamp
8. Preview iframe reloads with new PDF

## Technical Details

### Page Layout Specifications
- **Page Size**: A4 (210mm × 297mm)
- **Top Padding**: 30mm (letterhead space)
- **Bottom Safe Zone**: 28mm (footer space)
- **Content Area**: 239mm height (297 - 30 - 28)
- **Side Margins**: 25mm left and right
- **Conversion**: 96 DPI (3.78 pixels per mm)

### Content Type Styling
- **Date**: Right-aligned at 125mm, 6mm bottom margin
- **To (Recipient)**: Line height 1.5, 4mm bottom margin
- **Subject**: Center-aligned, bold, 4mm margins
- **Paragraph**: Justified text, 4mm bottom margin, 1mm paragraph spacing
- **Signature**: 6mm top margin, 40mm × 18mm signature space
- **Company**: 4mm margins
- **Separator**: Center-aligned, 4mm margins
- **Image**: 100% width, 55mm height, object-fit contain, 10mm margins

### Height Calculation
- Frontend uses DOM measurement for accurate height calculation
- Hidden measurement div renders content with exact CSS styles
- Fallback estimation for server-side or when DOM unavailable
- Real-time calculation on every content change

## Future Enhancements

- 🔜 Multiple templates support (different letterhead designs)
- 🔜 Bulk generation from CSV/Excel
- 🔜 Email integration (send offers directly)
- 🔜 Digital signature support (e-signature integration)
- 🔜 Version history (track changes and revisions)
- 🔜 Custom branding options (upload custom letterheads)
- 🔜 Export to Word format (.docx)
- 🔜 Undo/Redo functionality in editor
- 🔜 Drag-and-drop paragraph reordering
- 🔜 Rich text formatting (bold, italic, underline)
- 🔜 Table support in editor

## License

This project is for internal use.

## Support

For issues or questions, contact the development team.
