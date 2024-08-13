const mongoose = require('mongoose');

const annonceSchema = new mongoose.Schema({
    nomPropriete: { type: String, required: true },
    description: { type: String, required: true },
    prix: { type: String, required: true },
    localisation: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    superficie: { type: Number, required: true },
    nombreChambres: { type: Number, required: true },
    images: { type: [String], required: false },
    typePropriete: {
        type: String,
        enum: ['appartement', 'maison', 'villa', 'studio', 'bureau', 'commerce', 'terrain'],
        required: true
    },
    etatPropriete: {
        type: String,
        enum: ['neuf', 'excellent', 'bon', 'à rénover'],
        required: true
    },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateDePublication: { type: Date, default: Date.now } // Ajout du champ dateDePublication
});

const Annonce = mongoose.model('Annonce', annonceSchema);

module.exports = Annonce;
