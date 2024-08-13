const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/users'); // Chemin vers votre modèle User
require('dotenv').config();

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const hashedPassword = await bcrypt.hash('adminpassword', 10); // Remplacez par le mot de passe souhaité
        const admin = new User({
            nom: 'Admin',
            prenom: 'User',
            email: 'admin@example.com',
            telephone: '0123456789',
            image: '', // Chemin de l'image, si nécessaire
            password: hashedPassword,
            isAdmin: true
        });

        await admin.save();
        console.log('Admin user created');
        mongoose.connection.close();
    })
    .catch(error => {
        console.error('Error connecting to the database', error);
    });
