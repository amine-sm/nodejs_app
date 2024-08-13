const User = require('../models/users');

module.exports = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth?form=login');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth?form=login');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in checkAuth middleware:', error);
        req.session.destroy();
        res.redirect('/auth?form=login');
    }
};
