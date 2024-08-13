const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/users');
const Annonce = require('../models/annonces');
const saltRounds = 10;
const checkAuth = require('../middlewares/checkAuth');
const checkAdmin = require('../middlewares/checkAdmin');
const noCache = require('../middlewares/noCache');

const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
// Page d'inscription et de connexion
router.get('/auth', (req, res) => {
    const { form, error } = req.query;
    res.render('auth', { title: form === 'login' ? 'Se connecter' : 'S\'inscrire', form, error });
});

// Page d'accueil accessible sans connexion
router.get('/', noCache, async (req, res) => {
    try {
        const user = req.session.userId ? await User.findById(req.session.userId) : null;
        const annonces = await Annonce.find();  // Récupère toutes les annonces

        res.render('index', { 
            title: 'Home', 
            user, 
            annonces 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Une erreur est survenue lors de la récupération des annonces.');
    }
});
// Gestion des formulaires d'inscription
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { nom, prenom, email, telephone, password, isAdmin } = req.body;
        const image = req.file ? req.file.path.replace('public/', '') : '';
        if (!password) {
            return res.redirect('/auth?form=register&error=Password is required');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            nom,
            prenom,
            email,
            telephone,
            image,
            password: hashedPassword,
            isAdmin: isAdmin === 'on'
        });
        await newUser.save();
        res.redirect('/auth?form=login');
    } catch (error) {
        console.error(error);
        res.redirect('/auth?form=register&error=An error occurred. Please try again.');
    }
});

// Gestion des formulaires de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.isAdmin = user.isAdmin;
            res.redirect('/');
        } else {
            res.redirect('/auth?form=login&error=Invalid email or password');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/auth?form=login&error=An error occurred. Please try again.');
    }
});

// Déconnexion
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/');
        }
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.redirect('/');
    });
});

// Route réservée aux administrateurs
router.get('/admin-only', checkAuth, checkAdmin, noCache, (req, res) => {
    res.send('Welcome, Admin!');
});

// Route pour ajouter une annonce, accessible uniquement aux utilisateurs connectés
router.get('/ajouter-annonce', checkAuth,checkAdmin, noCache, async (req, res) => {
    const user = req.session.userId ? await User.findById(req.session.userId) : null;
    res.render('ajouter-annonce', { title: 'Ajouter une annonce', user });
});
// Route pour le tableau de bord, accessible uniquement aux administrateurs
router.get('/dashboard', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        // Compter le nombre total d'annonces
        const totalAnnonces = await Annonce.countDocuments();

        // Compter le nombre d'administrateurs
        const totalAdmins = await User.countDocuments({ isAdmin: true });

        // Compter le nombre total d'utilisateurs
        const totalUsers = await User.countDocuments();

        res.render('dashboard', {
            title: 'Tableau de bord',
            user,
            totalAnnonces,
            totalAdmins,
            totalUsers
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});


// Route pour afficher les utilisateurs avec une fonctionnalité de recherche
router.get('/users', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        const searchTerm = req.query.search_box || '';
        const users = await User.find({
            $or: [
                { nom: { $regex: searchTerm, $options: 'i' } },
                { prenom: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { telephone: { $regex: searchTerm, $options: 'i' } }
            ]
        });
        res.render('users', { title: 'Utilisateurs', users });
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard');
    }
});
// Route pour les administrateurs, accessible uniquement aux administrateurs
router.get('/admins', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true }); // Fetch all admins from the database
        res.render('admins', { title: 'Administrateurs', admins });
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard');
    }
});
// Route pour traiter la mise à jour d'un administrateur
router.post('/update_admin/:id', async (req, res) => {
    const { nom, prenom, email, telephone, password, c_pass } = req.body;

    // Vérifiez si les mots de passe correspondent (si l'utilisateur a fourni un nouveau mot de passe)
    if (password && password !== c_pass) {
        return res.status(400).send('Les mots de passe ne correspondent pas');
    }

    try {
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).send('Administrateur non trouvé');
        }

        // Mettre à jour les informations de l'administrateur
        admin.nom = nom;
        admin.prenom = prenom;
        admin.email = email;
        admin.telephone = telephone;

        if (password) {
            admin.password = await bcrypt.hash(password, saltRounds); // Hacher le nouveau mot de passe
        }

        await admin.save();
        res.redirect('/admins'); // Rediriger vers la liste des administrateurs
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la mise à jour de l\'administrateur');
    }
});
// Render the update form
router.get('/update_admin/:id', async (req, res) => {
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId).exec();

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('update', { user });
    } catch (err) {
        console.error('Error retrieving user data:', err);
        res.status(500).send('Error retrieving user data');
    }
});
// Route pour ajouter une annonce
router.post('/ajouter-annonce', checkAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { nomPropriete, description, prix, latitude, longitude, superficie, nombreChambres, typePropriete, etatPropriete } = req.body;

        // Extraire seulement les noms des fichiers
        const images = req.files ? req.files.map(file => path.basename(file.path)) : [];

        const newAnnonce = new Annonce({
            nomPropriete,
            description,
            prix,
            localisation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            superficie,
            nombreChambres,
            images,
            typePropriete,
            etatPropriete,
            agent: req.session.userId,
        });
        
        await newAnnonce.save();
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/ajouter-annonce?error=An error occurred. Please try again.');
    }
});

router.get('/annonces', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        const searchTerm = req.query.search_box || '';
        const query = searchTerm ? {
            $or: [
                { nomPropriete: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        } : {};
        
        const annonces = await Annonce.find(query); // Fetch announcements based on search term if provided
        res.render('annonces', { title: 'Annonces', annonces });
    } catch (error) {
        console.error(error);
        res.redirect('/dashboard'); // Redirect to dashboard on error
    }
});
router.get('/my_listings', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        // Fetch the logged-in user
        const user = await User.findById(req.session.userId);
        
        // Fetch all announcements for the logged-in admin
        const annonces = await Annonce.find({ agent: req.session.userId }); // Ensure this matches your logic

        // Render the EJS template with the announcements and user
        res.render('my_listings', { annonces, user });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).send('Internal Server Error'); // Handle errors appropriately
    }
});
router.get('/annonce_details/:id', checkAuth, checkAdmin, noCache, async (req, res) => {
    try {
        const annonce = await Annonce.findById(req.params.id).populate('agent', 'nom prenom');
        if (!annonce) {
            return res.redirect('/annonces?error=Propriété non trouvée.');
        }

        // Assuming you have a function to get the logged-in user
        const user = req.user; // Or however you store/get the user

        res.render('annonce_details', { annonce, user });
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while fetching the ad.');
    }
});
router.get('/annonce_detail/:id', async (req, res) => {
    try {
        const user = req.session.userId ? await User.findById(req.session.userId) : null;
        const annonce = await Annonce.findById(req.params.id).populate('agent', 'nom prenom');
        if (!annonce) {
            return res.redirect('/annonces?error=Propriété non trouvée.');
        }



        res.render('annonce_details', { annonce, user });
    } catch (error) {
        console.error(error);
        res.redirect('/annonces?error=An error occurred while fetching the ad.');
    }
});
router.post('/', async (req, res) => {
    try {
        const { h_location, h_type, h_offer, h_max, h_min } = req.body;
        let query = {};

        if (h_location) query['localisation.address'] = new RegExp(h_location, 'i');
        if (h_type) query['typePropriete'] = h_type;
        if (h_offer) query['etatPropriete'] = h_offer;
        if (h_max) query['prix'] = { $lte: parseFloat(h_max) };
        if (h_min) query['prix'] = { $gte: parseFloat(h_min) };

        const annonces = await Annonce.find(query);
        res.render('', { annonces }); // Assurez-vous que la vue 'search-results' existe
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur du serveur');
    }
});

// Render the update form
router.get('/update', async (req, res) => {
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId).exec();

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('update', { user });
    } catch (err) {
        console.error('Error retrieving user data:', err);
        res.status(500).send('Error retrieving user data');
    }
});

// Handle form submission
router.post('/update', async (req, res) => {
    const userId = req.session.userId;
    const { name, prenom,email, number, old_pass, new_pass, c_pass } = req.body;

    try {
        const user = await User.findById(userId).exec();

        if (!user) {
            return res.status(404).send('User not found');
        }

        if (new_pass !== c_pass) {
            return res.status(400).send('New passwords do not match');
        }

        if (old_pass) {
            const isMatch = await user.comparePassword(old_pass);
            if (!isMatch) {
                return res.status(400).send('Old password is incorrect');
            }
        }

        user.nom = name;
        user.prenom = prenom;
        user.email = email;
        user.telephone = number;

        if (new_pass) {
            user.password = new_pass; // Password will be hashed automatically on save due to pre-save hook
        }

        await user.save();
        res.redirect('/update');
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).send('Error updating user');
    }
});

// Route pour afficher les administrateurs
router.get('/admins', checkAuth,checkAdmin,noCache,async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true });
        res.render('admins', { title: 'Administrateurs', admins }); // Assurez-vous que le nom du fichier EJS est correct
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la récupération des administrateurs');
    }
});
// Route pour afficher le formulaire d'ajout d'un administrateur
router.get('/add', (req, res) => {
    res.render('add_admin');
});

// Route pour afficher le formulaire d'ajout d'un administrateur
router.get('/ajouter_admin', (req, res) => {
    res.render('ajouter_admin'); // Assurez-vous que 'add_admin.ejs' est dans le dossier 'views'
});

// Route pour traiter l'ajout d'un administrateur
router.post('/ajouter_admin', async (req, res) => {
    const { nom, prenom, email, telephone, password, c_pass } = req.body;

    // Vérifiez si les mots de passe correspondent
    if (password !== c_pass) {
        return res.status(400).send('Les mots de passe ne correspondent pas');
    }

    try {
        // Vérifiez si l'email est déjà utilisé
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            return res.status(400).send('Cet email est déjà utilisé');
        }

        // Créez un nouvel administrateur
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newAdmin = new User({
            nom,
            prenom,
            email,
            telephone,
            password: hashedPassword,
            isAdmin: true // Assurez-vous que l'utilisateur est un administrateur
        });

        await newAdmin.save();
        res.redirect('/ajouter_admin'); // Rediriger vers la liste des administrateurs ou une autre page
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de l\'ajout de l\'administrateur');
    }
});
module.exports = router;
