import express from 'express';
import cors from 'cors';
import path from 'path';

import offerLetterRoutes from './routes/offerLetterRoutes.js';
// import wkhtmlOfferLetterRoutes from './routes/wkhtmlOfferLetterRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// VERY IMPORTANT
app.use(
    '/GeneratedOfferLetter',
    express.static(
        path.join(
            process.cwd(),
            'GeneratedOfferLetter'
        )
    )
);

// Routes
app.use('/api/offerletter', offerLetterRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'HR Management API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});