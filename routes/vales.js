const express = require('express');
const router = express.Router();
const db = require('../database');
// Importamos os middlewares de proteção
const { checkAuth, checkAdmin } = require('../middlewares/auth');

// Query base com Joins para evitar repetição de código
const queryJoin = `
    SELECT v.*, 
    u1.nome as nome_saida, 
    u2.nome as nome_chegada,
    (v.quantidade * v.valor_unitario) as total_linha
    FROM vales v
    LEFT JOIN unidades u1 ON v.saida = u1.id
    LEFT JOIN unidades u2 ON v.chegada = u2.id
`;

// --- ROTA: FORMULÁRIO DE CADASTRO (Acessível via /vales/) ---
// routes/vales.js

router.get('/', checkAuth, (req, res) => {
    // 1. Busca as unidades
    db.all("SELECT * FROM unidades ORDER BY sigla", [], (err, unidades) => {
        if (err) return res.status(500).send("Erro ao carregar unidades");

        // 2. Busca os usuários para o dropdown
        db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, usuarios) => {
            if (err) return res.status(500).send("Erro ao carregar usuários");

            // 3. Envia os dois arrays para a view
            res.render('vales/cadastro', { 
                unidades, 
                usuarios, 
                usuarioLogado: req.session.user 
            });
        });
    });
});

// --- ROTA: PROCESSAR CADASTRO ---
router.post('/cadastrar', checkAuth, (req, res) => {
    const { usuario, data, saida, chegada, quantidade, valor, motivo } = req.body;
    const query = `INSERT INTO vales (usuario, data, saida, chegada, quantidade, valor_unitario, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [usuario, data, saida, chegada, quantidade, valor, motivo], (err) => {
        if (err) return res.status(500).send("Erro ao salvar vale");
        res.redirect('/vales/relatorio');
    });
});

// --- ROTA: RELATÓRIO (Acessível via /vales/relatorio) ---
router.get('/relatorio', checkAuth, (req, res) => {
    const { usuario, mes } = req.query;
    
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

    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, listaUsuarios) => {
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).send("Erro ao processar relatório");

            const totalGeral = rows.reduce((acc, curr) => acc + curr.total_linha, 0);
            const totalPago = rows.filter(r => r.pago === 1).reduce((acc, curr) => acc + curr.total_linha, 0);

            res.render('vales/relatorio', { 
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

// --- ROTA: AUTORIZAÇÃO (Acessível via /vales/autorizacao) ---
router.get('/autorizacao', checkAuth, checkAdmin, (req, res) => {
    const sql = `${queryJoin} ORDER BY v.data DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send("Erro ao carregar autorizações");
        res.render('vales/autorizacao', { todosVales: rows });
    });
});

// --- ROTA: ALTERAR STATUS (Autorizar/Recusar) ---
router.post('/status/:id/:novoStatus', checkAuth, checkAdmin, (req, res) => {
    const { id, novoStatus } = req.params;
    db.run("UPDATE vales SET status = ? WHERE id = ?", [novoStatus, id], (err) => {
        if (err) return res.status(500).send("Erro ao atualizar status");
        res.redirect('/vales/autorizacao');
    });
});

// --- ROTA: ALTERAR PAGAMENTO (Pago/Pendente) ---
router.post('/alternar-pagamento/:id', checkAuth, checkAdmin, (req, res) => {
    const id = req.params.id;
    db.get("SELECT pago FROM vales WHERE id = ?", [id], (err, row) => {
        if (row) {
            const novoStatus = row.pago === 0 ? 1 : 0;
            db.run("UPDATE vales SET pago = ? WHERE id = ?", [novoStatus, id], () => {
                res.redirect('/vales/relatorio');
            });
        }
    });
});
// Rota para exportar CSV de vales PAGOS
router.get('/relatorio/exportar', checkAuth, (req, res) => {
    const { usuario, mes, pendentes } = req.query;

    // Base da query: Sempre filtramos por vales autorizados (status=1)
    let sql = `${queryJoin} WHERE v.status = 1`;
    let params = [];

    // Se o usuário NÃO marcou para incluir pendentes, filtramos apenas os pagos
    if (pendentes !== 'true') {
        sql += " AND v.pago = 1";
    }

    if (usuario && usuario !== "") {
        sql += " AND v.usuario = ?";
        params.push(usuario);
    }

    if (mes && mes !== "") {
        sql += " AND strftime('%Y-%m', v.data) = ?";
        params.push(mes);
    }

    sql += " ORDER BY v.data ASC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).send("Erro ao gerar relatório");

        // Adicionamos a coluna "Pagamento" no cabeçalho
        let csv = 'Colaborador;Data;Saida;Chegada;Motivo;Pagamento;Total (R$)\n';

        rows.forEach(r => {
            const statusPagamento = r.pago === 1 ? 'PAGO' : 'PENDENTE';
            csv += `${r.usuario};${r.data};${r.nome_saida};${r.nome_chegada};${r.motivo || 'N/A'};${statusPagamento};${r.total_linha.toFixed(2)}\n`;
        });

        const fileName = `relatorio_vales_${mes || 'geral'}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        
        // \uFEFF é o BOM para o Excel abrir com acentos corretos
        res.send('\uFEFF' + csv);
    });
});

module.exports = router;