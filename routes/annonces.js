const express = require('express');
const router = express.Router();
const Annonce = require('../models/annonces');
const upload = require('./upload'); // Assurez-vous que le chemin est correct

// Middleware pour vérifier l'authentification
function checkAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/auth?form=login');
    }
}

// Route pour afficher toutes les annonces
router.get('/annonces', async (req, res) => {
    try {
        const annonces = await Annonce.find().populate('agent', 'nom prenom');
        res.render('annonces', { annonces });
    } catch (error) {
        console.error(error);
        res.redirect('/?error=An error occurred while fetching the ads.');
    }
});

// Route pour afficher une annonce spécifique
router.get('/annonce_details/:id', async (req, res) => {
    try {
        const annonce = await Annonce.findById(req.params.id).populate('agent', 'nom prenom');
        if (!annonce) {
            return res.redirect('/annonces?error=Propriété non trouvée.');
        }
        res.render('annonce_details', { annonce });
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while fetching the ad.');
    }
});


// Route pour créer une nouvelle annonce
router.post('/annonce', checkAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { nomPropriete, description, prix, latitude, longitude, superficie, nombreChambres, typePropriete, etatPropriete } = req.body;
        const images = req.files.map(file => file.path.replace('public/', ''));

        const nouvelleAnnonce = new Annonce({
            nomPropriete,
            description,
            prix,
            localisation: { latitude, longitude },
            superficie,
            nombreChambres,
            images,
            typePropriete,
            etatPropriete,
            agent: req.session.userId
        });

        await nouvelleAnnonce.save();
        res.redirect('/annonces');
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while creating the ad.');
    }
});

// Route pour mettre à jour une annonce
router.put('/annonce/:id', checkAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { nomPropriete, description, prix, latitude, longitude, superficie, nombreChambres, typePropriete, etatPropriete } = req.body;
        const images = req.files.map(file => file.path.replace('public/', ''));

        await Annonce.findByIdAndUpdate(req.params.id, {
            nomPropriete,
            description,
            prix,
            localisation: { latitude, longitude },
            superficie,
            nombreChambres,
            images,
            typePropriete,
            etatPropriete,
            agent: req.session.userId
        });

        res.redirect('/annonce/' + req.params.id);
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while updating the ad.');
    }
});
// Route pour afficher le formulaire d'ajout d'annonce
router.get('/ajouter-annonce', checkAuth, (req, res) => {
    res.render('ajouterAnnonce', { title: 'Ajouter une annonce' });
});
// Route pour créer une nouvelle annonce
router.post('/annonce', checkAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { nomPropriete, description, prix, latitude, longitude, superficie, nombreChambres, typePropriete, etatPropriete } = req.body;
        const images = req.files.map(file => file.path.replace('public/', ''));

        const nouvelleAnnonce = new Annonce({
            nomPropriete,
            description,
            prix,
            localisation: { latitude, longitude },
            superficie,
            nombreChambres,
            images,
            typePropriete,
            etatPropriete,
            agent: req.session.userId
        });

        await nouvelleAnnonce.save();
        res.redirect('/annonces');
    } catch (error) {
        console.error(error);
        res.redirect('/ajouter-annonce?error=An error occurred while creating the ad.');
    }
});
// Route pour supprimer une annonce
router.delete('/annonce/:id', checkAuth, async (req, res) => {
    try {
        await Annonce.findByIdAndDelete(req.params.id);
        res.redirect('/annonces');
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while deleting the ad.');
    }
});

module.exports = router;
