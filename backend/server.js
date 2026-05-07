const express = require('express');
const cors = require('cors');
const offerLetterRoutes = require('./routes/offerLetterRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/offerletter', offerLetterRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'HR Management API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
