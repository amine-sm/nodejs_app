require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const userRoutes = require('./routes/routes');
const annonceRoutes = require('./routes/annonces'); // Importer les routes d'annonces

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('public/uploads'));

// Session
app.use(session({
    secret: "My secret key",
    saveUninitialized: true,
    resave: false
}));

app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

// Set template engine
app.set("view engine", "ejs");

// Connection to database
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', (error) => {
    console.error('Database connection error:', error);
});
db.once('open', () => {
    console.log('Connected to the database');
});

// Routes
app.use('/', userRoutes);
app.use('/', annonceRoutes); // Utiliser les routes d'annonces

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
