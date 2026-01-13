const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { checkAuth, checkAdmin } = require('../middlewares/auth');

// --- AUTENTICAÇÃO (LOGIN/LOGOUT) ---

router.get('/login', (req, res) => {
    res.render('login'); // login.ejs geralmente fica na raiz de views
});

// routes/auth.js - Localize a rota POST /login

router.post('/login', (req, res) => {
    const { login, senha } = req.body;
    
    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (err) {
            console.error("Erro no Banco:", err);
            return res.status(500).send("Erro no banco de dados");
        }

        if (user) {
            const senhaCorreta = await bcrypt.compare(senha, user.senha);
            if (senhaCorreta) {
                // SUCESSO: Definindo os dados da sessão
                req.session.user = {
                    id: user.id,
                    nome: user.nome,
                    permissao: user.permissao,
                    login: user.login
                };

                // O 'return' aqui é CRUCIAL para não executar o código abaixo
                return req.session.save((err) => {
                    if (err) return res.status(500).send("Erro ao salvar sessão");
                    res.redirect('/'); 
                });
            }
        }
        
        // Se chegou aqui, é porque o user não existe OU a senha está errada
        // Só enviamos esta resposta se o redirecionamento lá de cima NÃO aconteceu
        return res.send("Usuário ou senha inválidos. <a href='/login'>Tentar novamente</a>");
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Alteração de senha pelo próprio usuário (Modal no login)
router.post('/login/alterar-senha', async (req, res) => {
    const { login, senhaAtual, novaSenha } = req.body;
    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (user && await bcrypt.compare(senhaAtual, user.senha)) {
            const novoHash = await bcrypt.hash(novaSenha, 10);
            db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [novoHash, user.id], () => {
                res.send("Senha alterada com sucesso! <a href='/login'>Logar</a>");
            });
        } else {
            res.send("Dados incorretos.");
        }
    });
});

// --- GESTÃO DE USUÁRIOS (ADMIN) ---

router.get('/usuarios', checkAuth, checkAdmin, (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, rows) => {
        res.render('vales/usuarios', { usuarios: rows }); // Caminho atualizado
    });
});

router.post('/usuarios/novo', checkAuth, checkAdmin, async (req, res) => {
    const { login, nome, senha, permissao } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    db.run("INSERT INTO usuarios (login, nome, senha, permissao) VALUES (?, ?, ?, ?)", 
        [login, nome, hash, permissao], (err) => {
            if (err) return res.send("Erro ao cadastrar. Login já existe?");
            res.redirect('/usuarios');
        });
});

router.post('/usuarios/editar-permissao/:id', checkAuth, checkAdmin, (req, res) => {
    const { permissao } = req.body;
    db.run("UPDATE usuarios SET permissao = ? WHERE id = ?", [permissao, req.params.id], () => {
        res.redirect('/usuarios');
    });
});

router.post('/usuarios/reset-senha/:id', checkAuth, checkAdmin, async (req, res) => {
    const { novaSenha } = req.body;
    const hash = await bcrypt.hash(novaSenha, 10);
    db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, req.params.id], () => {
        res.redirect('/usuarios');
    });
});

router.post('/usuarios/deletar/:id', checkAuth, checkAdmin, (req, res) => {
    db.run("DELETE FROM usuarios WHERE id = ?", [req.params.id], () => {
        res.redirect('/usuarios');
    });
});

// --- GESTÃO DE UNIDADES (ADMIN) ---

router.get('/unidades', checkAuth, checkAdmin, (req, res) => {
    db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, rows) => {
        res.render('vales/unidades', { unidades: rows }); // Caminho atualizado
    });
});

router.post('/unidades/novo', checkAuth, checkAdmin, (req, res) => {
    const { sigla, nome } = req.body;
    db.run("INSERT INTO unidades (sigla, nome) VALUES (?, ?)", [sigla, nome], () => {
        res.redirect('/unidades');
    });
});

router.post('/unidades/deletar/:id', checkAuth, checkAdmin, (req, res) => {
    db.run("DELETE FROM unidades WHERE id = ?", [req.params.id], () => {
        res.redirect('/unidades');
    });
});


module.exports = router;