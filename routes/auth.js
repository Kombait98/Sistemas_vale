const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database'); // Aqui agora é o seu Pool do Postgres
const { checkAuth, checkAdmin } = require('../middlewares/auth');

// --- AUTENTICAÇÃO (LOGIN/LOGOUT) ---

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { login, senha } = req.body;
    
    try {
        // No Postgres, usamos db.query e o resultado vem em result.rows
        const result = await db.query("SELECT * FROM usuarios WHERE login = $1", [login]);
        const user = result.rows[0];

        if (user) {
            const senhaCorreta = await bcrypt.compare(senha, user.senha);
            if (senhaCorreta) {
                req.session.user = {
                    id: user.id,
                    nome: user.nome,
                    permissao: user.permissao,
                    login: user.login
                };
                
                return req.session.save((err) => {
                    if (err) return res.status(500).send("Erro ao salvar sessão");
                    res.redirect('/'); 
                });
            }
        }
        return res.send("Usuário ou senha inválidos. <a href='/login'>Tentar novamente</a>");
    } catch (err) {
        console.error("Erro no Banco:", err);
        return res.status(500).send("Erro no banco de dados");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

router.post('/login/alterar-senha', async (req, res) => {
    const { login, senhaAtual, novaSenha } = req.body;
    
    try {
        const result = await db.query("SELECT * FROM usuarios WHERE login = $1", [login]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(senhaAtual, user.senha)) {
            const novoHash = await bcrypt.hash(novaSenha, 10);
            await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [novoHash, user.id]);
            res.send("Senha alterada com sucesso! <a href='/login'>Logar</a>");
        } else {
            res.send("Dados incorretos.");
        }
    } catch (err) {
        res.status(500).send("Erro ao processar alteração.");
    }
});

// --- GESTÃO DE USUÁRIOS (ADMIN) ---

router.get('/usuarios', checkAuth, checkAdmin, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM usuarios ORDER BY nome");
        res.render('vales/usuarios', { usuarios: result.rows });
    } catch (err) {
        res.status(500).send("Erro ao buscar usuários.");
    }
});

router.post('/usuarios/novo', checkAuth, checkAdmin, async (req, res) => {
    const { login, nome, senha, permissao } = req.body;
    try {
        const hash = await bcrypt.hash(senha, 10);
        await db.query(
            "INSERT INTO usuarios (login, nome, senha, permissao) VALUES ($1, $2, $3, $4)", 
            [login, nome, hash, permissao]
        );
        res.redirect('/usuarios');
    } catch (err) {
        console.error(err);
        res.send("Erro ao cadastrar. Login já existe?");
    }
});

router.post('/usuarios/editar-permissao/:id', checkAuth, checkAdmin, async (req, res) => {
    const { permissao } = req.body;
    try {
        await db.query("UPDATE usuarios SET permissao = $1 WHERE id = $2", [permissao, req.params.id]);
        res.redirect('/usuarios');
    } catch (err) {
        res.status(500).send("Erro ao atualizar permissão.");
    }
});

router.post('/usuarios/reset-senha/:id', checkAuth, checkAdmin, async (req, res) => {
    const { novaSenha } = req.body;
    try {
        const hash = await bcrypt.hash(novaSenha, 10);
        await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [hash, req.params.id]);
        res.redirect('/usuarios');
    } catch (err) {
        res.status(500).send("Erro ao resetar senha.");
    }
});

router.post('/usuarios/deletar/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM usuarios WHERE id = $1", [req.params.id]);
        res.redirect('/usuarios');
    } catch (err) {
        res.status(500).send("Erro ao deletar usuário.");
    }
});

// --- GESTÃO DE UNIDADES (ADMIN) ---

router.get('/unidades', checkAuth, checkAdmin, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM unidades ORDER BY sigla");
        res.render('vales/unidades', { unidades: result.rows });
    } catch (err) {
        res.status(500).send("Erro ao buscar unidades.");
    }
});

router.post('/unidades/novo', checkAuth, checkAdmin, async (req, res) => {
    const { sigla, nome } = req.body;
    try {
        await db.query("INSERT INTO unidades (sigla, nome) VALUES ($1, $2)", [sigla, nome]);
        res.redirect('/unidades');
    } catch (err) {
        res.status(500).send("Erro ao criar unidade.");
    }
});

router.post('/unidades/deletar/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM unidades WHERE id = $1", [req.params.id]);
        res.redirect('/unidades');
    } catch (err) {
        res.status(500).send("Erro ao deletar unidade.");
    }
});

module.exports = router;