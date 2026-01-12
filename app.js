// 1. Importações
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log("Caminho do projeto:", __dirname);
console.log("Variável APP_SECRET carregada:", process.env.APP_SECRET ? "Sim" : "Nao");
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const queryJoin = `
    SELECT v.*, 
    u1.nome as nome_saida, 
    u2.nome as nome_chegada,
    (v.quantidade * v.valor_unitario) as total_linha
    FROM vales v
    LEFT JOIN unidades u1 ON v.saida = u1.id
    LEFT JOIN unidades u2 ON v.chegada = u2.id
`;


// 2. Middlewares de Configuração
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 3. Configuração da Sessão (Certifique-se que o segredo existe no .env)
app.use(session({
    secret: process.env.APP_SECRET || 'chave-de-emergencia',
    resave: false,
    saveUninitialized: false, // Alterado para false por segurança
    cookie: { maxAge: 3600000 } 
}));
// Middleware para passar o usuário logado para todas as views EJS automaticamente
app.use((req, res, next) => {
    res.locals.usuarioLogado = req.session.user || null;
    next();
});

// Rota de Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// 4. Middlewares de Proteção
function checkAuth(req, res, next) {
    console.log("Verificando autenticação...");
    if (req.session.user) {
        console.log("Usuário logado:", req.session.user.login);
        return next();
    }
    console.log("Usuário não logado, redirecionando para login.");
    res.redirect('/login');
}

function checkAdmin(req, res, next) {
    if (req.session.user && req.session.user.permissao === 'admin') {
        return next();
    }
    res.status(403).send("Acesso negado: Somente administradores.");
}

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { login, senha } = req.body;
    console.log("Tentativa de login:", login);

    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (err) {
            console.error("Erro no Banco:", err);
            return res.status(500).send("Erro no banco de dados");
        }

        if (user) {
            const senhaCorreta = await bcrypt.compare(senha, user.senha);
            if (senhaCorreta) {
                // SUCESSO: Salvando na sessão
                req.session.user = {
                    id: user.id,
                    nome: user.nome,
                    permissao: user.permissao,
                    login: user.login
                };

                // Força a gravação da sessão antes do redirecionamento
                return req.session.save(() => {
                    console.log("Sessão salva. Redirecionando...");
                    res.redirect('/');
                });
            }
        }
        
        console.log("Falha no login para:", login);
        res.send("Usuário ou senha inválidos. <a href='/login'>Tentar novamente</a>");
    });
});

app.get('/', checkAuth, (req, res) => {
    console.log("Acessando a Home...");
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, usuarios) => {
        if (err) return res.status(500).send("Erro ao buscar usuários");

        db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, unidades) => {
            if (err) return res.status(500).send("Erro ao buscar unidades");

            console.log("Renderizando cadastro...");
            res.render('cadastro', { 
                usuarios, 
                unidades, 
                usuarioLogado: req.session.user 
            });
        });
    });
});
// --- ROTAS DE USUÁRIOS ---

app.get('/usuarios',checkAuth, checkAdmin,  (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, rows) => {
        res.render('usuarios', { usuarios: rows });
    });
});


// ---Rota para criar novo usuário ---
app.post('/usuarios/novo', checkAuth, checkAdmin, async (req, res) => {
    const { login, nome, senha, permissao } = req.body;
    
    try {
        // Criptografa a senha antes de salvar
        const hash = await bcrypt.hash(senha, 10);
        
        db.run("INSERT INTO usuarios (login, nome, senha, permissao) VALUES (?, ?, ?, ?)", 
            [login, nome, hash, permissao], (err) => {
            if (err) {
                console.error(err);
                return res.send("Erro ao cadastrar usuário (Login já existe?)");
            }
            res.redirect('/usuarios');
        });
    } catch (e) {
        res.status(500).send("Erro ao gerar senha");
    }
});

// --- Rota para alterar permissão ---
app.post('/usuarios/editar-permissao/:id', checkAuth, checkAdmin, (req, res) => {
    const { permissao } = req.body;
    const { id } = req.params;

    db.run("UPDATE usuarios SET permissao = ? WHERE id = ?", [permissao, id], (err) => {
        if (err) return res.status(500).send("Erro ao atualizar permissão");
        res.redirect('/usuarios');
    });
});

app.post('/usuarios/deletar/:id', checkAuth, checkAdmin,(req, res) => {
    const id = req.params.id;
    
    db.run("DELETE FROM usuarios WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err.message);
            return res.send("Erro ao deletar usuário. Verifique se ele possui vales vinculados.");
        }
        res.redirect('/usuarios');
    });
});
app.post('/usuarios/reset-senha/:id', checkAuth, checkAdmin, async (req, res) => {
    const { novaSenha } = req.body;
    const { id } = req.params;

    if (!novaSenha || novaSenha.length < 4) {
        return res.send("A senha deve ter pelo menos 4 caracteres. <a href='/usuarios'>Voltar</a>");
    }

    try {
        // Gera o novo hash da senha
        const hash = await bcrypt.hash(novaSenha, 10);
        
        db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao atualizar a senha no banco.");
            }
            res.redirect('/usuarios');
        });
    } catch (e) {
        res.status(500).send("Erro ao processar a criptografia.");
    }
});



// Rota de Vales
app.get('/', (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, usuarios) => {
        db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, unidades) => {
            res.render('cadastro', { usuarios, unidades });
        });
    });
});
app.post('/vales/status/:id/:novoStatus', (req, res) => {
    const { id, novoStatus } = req.params;
    db.run("UPDATE vales SET status = ? WHERE id = ?", [novoStatus, id], () => {
        res.redirect('/autorizacao');
    });
});
app.post('/vales/status/:id/:novoStatus', (req, res) => {
    const { id, novoStatus } = req.params;
    // novoStatus: 1 para autorizar, 2 para recusar
    db.run("UPDATE vales SET status = ? WHERE id = ?", [novoStatus, id], () => {
        res.redirect('/autorizacao');
    });
});

app.post('/vales/alternar-pagamento/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT pago FROM vales WHERE id = ?", [id], (err, row) => {
        if (row) {
            const novoStatus = row.pago === 0 ? 1 : 0;
            db.run("UPDATE vales SET pago = ? WHERE id = ?", [novoStatus, id], () => {
                res.redirect('/relatorio');
            });
        }
    });
});
// Rota para Cadastro
app.post('/cadastrar', (req, res) => {
    const { usuario, data, saida, chegada, quantidade, valor, motivo } = req.body;
    const query = `INSERT INTO vales (usuario, data, saida, chegada, quantidade, valor_unitario, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [usuario, data, saida, chegada, quantidade, valor, motivo], () => {
        res.redirect('/relatorio');
    });
});
//Rota de autorização 
app.get('/autorizacao',checkAuth, checkAdmin, (req, res) => {
    // Usa a queryJoin pura, apenas ordenando por data
    const sql = `${queryJoin} ORDER BY v.data DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.send("Erro ao carregar autorizações");
        res.render('autorizacao', { todosVales: rows });
    });
});

//Rota de Relatorio 
app.get('/relatorio',checkAuth, (req, res) => {
    const { usuario, mes } = req.query;
    
    // Começamos com a query base, filtrando apenas autorizados (status=1)
    let sql = `${queryJoin} WHERE v.status = 1`;
    let params = [];

    if (usuario && usuario !== "") {
        sql += " AND v.usuario = ?";
        params.push(usuario);
    }

    if (mes && mes !== "") {
        sql += " AND strftime('%Y-%m', v.data) = ?";
        params.push(mes);
    }

    sql += " ORDER BY v.data DESC";

    // 1. Busca usuários para o filtro
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, listaUsuarios) => {
        // 2. Busca os vales usando a nossa query com JOIN
        db.all(sql, params, (err, rows) => {
            if (err) return res.send("Erro ao processar relatório");

            const totalGeral = rows.reduce((acc, curr) => acc + curr.total_linha, 0);
            const totalPago = rows.filter(r => r.pago === 1).reduce((acc, curr) => acc + curr.total_linha, 0);

            res.render('relatorio', { 
                registros: rows, 
                totalGeral, 
                totalPago,
                totalPendente: totalGeral - totalPago,
                usuarios: listaUsuarios,
                filtroUsuario: usuario || "",
                filtroMes: mes || ""
            });
        });
    });
});


// --- ROTAS DE UNIDADES ---
app.get('/unidades',checkAuth, checkAdmin, (req, res) => {
    db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, rows) => {
        res.render('unidades', { unidades: rows });
    });
});

app.post('/unidades/novo',checkAuth, checkAdmin,(req, res) => {
    const { sigla, nome } = req.body;
    db.run("INSERT INTO unidades (sigla, nome) VALUES (?, ?)", [sigla, nome], () => {
        res.redirect('/unidades');
    });
});

app.post('/unidades/deletar/:id',checkAuth, checkAdmin, (req, res) => {
    db.run("DELETE FROM unidades WHERE id = ?", [req.params.id], () => {
        res.redirect('/unidades');
    });
});

// --- ROTA PARA O PRÓPRIO USUÁRIO ALTERAR SENHA NA TELA DE LOGIN ---
app.post('/login/alterar-senha', async (req, res) => {
    const { login, senhaAtual, novaSenha } = req.body;

    if (!login || !senhaAtual || !novaSenha) {
        return res.send("Todos os campos são obrigatórios. <a href='/login'>Voltar</a>");
    }

    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (err) return res.status(500).send("Erro no banco de dados.");
        
        // Verifica se o usuário existe e se a senha atual está correta
        if (user && await bcrypt.compare(senhaAtual, user.senha)) {
            try {
                const novoHash = await bcrypt.hash(novaSenha, 10);
                db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [novoHash, user.id], (err) => {
                    if (err) return res.status(500).send("Erro ao atualizar senha.");
                    res.send("Senha alterada com sucesso! <a href='/login'>Clique aqui para logar</a>");
                });
            } catch (e) {
                res.status(500).send("Erro ao processar criptografia.");
            }
        } else {
            res.send("Login ou senha atual incorretos. <a href='/login'>Tentar novamente</a>");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em ambiente ${process.env.NODE_ENV} na porta ${PORT}`);
});
