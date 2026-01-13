const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const app = express();

// Configurações Base
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.APP_SECRET || 'chave-de-emergencia',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } 
}));

// Middleware Global para View
app.use((req, res, next) => {
    res.locals.usuarioLogado = req.session.user || null;
    next();
});

// IMPORTAÇÃO DOS MÓDULOS DE ROTAS
const authRoutes = require('./routes/auth');
const valesRoutes = require('./routes/vales');
//const travelsRoutes = require('./routes/travels');
//const fluxoRoutes = require('./routes/fluxo');

// USO DAS ROTAS (Prefixos)
app.use('/', authRoutes);      // Login e gestão de base
app.use('/vales', valesRoutes); // Tudo de vales agora começa com /vales
//app.use('/travels', travelsRoutes);
//app.use('/fluxo', fluxoRoutes);
// Rota de entrada do sistema
app.get('/', (req, res) => {
    if (req.session.user) {
        // Se estiver logado, vai para a aplicação de Vales
        return res.redirect('/vales');
    }
    // Se não estiver logado, vai para o login
    res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Modular rodando na porta ${PORT}`);
});