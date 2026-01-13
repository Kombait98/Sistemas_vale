// middlewares/auth.js

module.exports = {
    checkAuth: (req, res, next) => {
        if (req.session.user) {
            return next();
        }
        res.redirect('/login');
    },
    checkAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.permissao === 'admin') {
            return next();
        }
        res.status(403).send("Acesso negado: Somente administradores.");
    }
};