const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const app = express();
const queryJoin = `
    SELECT v.*, 
    u1.nome as nome_saida, 
    u2.nome as nome_chegada,
    (v.quantidade * v.valor_unitario) as total_linha
    FROM vales v
    LEFT JOIN unidades u1 ON v.saida = u1.id
    LEFT JOIN unidades u2 ON v.chegada = u2.id
`;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- ROTAS DE USUÁRIOS ---

// Tela de listagem e cadastro de usuários
app.get('/usuarios', (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, rows) => {
        res.render('usuarios', { usuarios: rows });
    });
});

// Salvar novo usuário
app.post('/usuarios/novo', (req, res) => {
    const { nome } = req.body;
    db.run("INSERT INTO usuarios (nome) VALUES (?)", [nome], (err) => {
        res.redirect('/usuarios');
    });
});

// --- ROTAS DE VALES ---

// Modificada: Busca usuários para o dropdown do cadastro
app.get('/', (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, usuarios) => {
        db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, unidades) => {
            res.render('cadastro', { usuarios, unidades });
        });
    });
});

app.post('/cadastrar', (req, res) => {
    const { usuario, data, saida, chegada, quantidade, valor, motivo } = req.body;
    const query = `INSERT INTO vales (usuario, data, saida, chegada, quantidade, valor_unitario, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [usuario, data, saida, chegada, quantidade, valor, motivo], () => {
        res.redirect('/relatorio');
    });
});

app.get('/autorizacao', (req, res) => {
    // Usamos a queryJoin pura, apenas ordenando por data
    const sql = `${queryJoin} ORDER BY v.data DESC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.send("Erro ao carregar autorizações");
        res.render('autorizacao', { todosVales: rows });
    });
});
app.post('/vales/status/:id/:novoStatus', (req, res) => {
    const { id, novoStatus } = req.params;
    db.run("UPDATE vales SET status = ? WHERE id = ?", [novoStatus, id], () => {
        res.redirect('/autorizacao');
    });
});

// --- NOVO: AÇÕES DE STATUS ---
app.post('/vales/status/:id/:novoStatus', (req, res) => {
    const { id, novoStatus } = req.params;
    // novoStatus: 1 para autorizar, 2 para recusar
    db.run("UPDATE vales SET status = ? WHERE id = ?", [novoStatus, id], () => {
        res.redirect('/autorizacao');
    });
});

app.get('/relatorio', (req, res) => {
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

    // 1. Buscamos usuários para o filtro
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, listaUsuarios) => {
        // 2. Buscamos os vales usando a nossa query com JOIN
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
// Rota para deletar usuário
app.post('/usuarios/deletar/:id', (req, res) => {
    const id = req.params.id;
    
    db.run("DELETE FROM usuarios WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err.message);
            return res.send("Erro ao deletar usuário. Verifique se ele possui vales vinculados.");
        }
        res.redirect('/usuarios');
    });
});

app.post('/vales/alternar-pagamento/:id', (req, res) => {
    const id = req.params.id;
    
    // Primeiro buscamos o estado atual
    db.get("SELECT pago FROM vales WHERE id = ?", [id], (err, row) => {
        if (row) {
            const novoStatus = row.pago === 0 ? 1 : 0;
            db.run("UPDATE vales SET pago = ? WHERE id = ?", [novoStatus, id], () => {
                res.redirect('/relatorio'); // Volta para a página anterior (relatório)
            });
        }
    });
});

// --- ROTAS DE UNIDADES ---
app.get('/unidades', (req, res) => {
    db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, rows) => {
        res.render('unidades', { unidades: rows });
    });
});

app.post('/unidades/novo', (req, res) => {
    const { sigla, nome } = req.body;
    db.run("INSERT INTO unidades (sigla, nome) VALUES (?, ?)", [sigla, nome], () => {
        res.redirect('/unidades');
    });
});

app.post('/unidades/deletar/:id', (req, res) => {
    db.run("DELETE FROM unidades WHERE id = ?", [req.params.id], () => {
        res.redirect('/unidades');
    });
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));