const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const { checkAuth, checkAdmin } = require('./middlewares/auth');
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
// Middleware para passar dados para as views automaticamente
app.use((req, res, next) => {
    res.locals.usuarioLogado = req.session.user || null;

    // Detectar o módulo ativo com base no caminho da URL (Path)
    const path = req.path;
    
    if (path.startsWith('/vales')) {
        res.locals.moduloAtivo = 'vales';
    } else if (path.startsWith('/travels')) {
        res.locals.moduloAtivo = 'travels';
    } else if (path.startsWith('/fluxo')) {
        res.locals.moduloAtivo = 'fluxo';
    } else {
        res.locals.moduloAtivo = null; // Caso esteja na tela de seleção de módulos
    }

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
app.get('/', checkAuth, (req, res) => {
    res.render('modulos'); // Renderiza a nova tela de botões grandes
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Modular rodando na porta ${PORT}`);
});