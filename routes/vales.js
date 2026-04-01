const express = require('express');
const router = express.Router();
const db = require('../database'); // Conexão Pool do PostgreSQL
const { checkAuth, checkModule,checkAdmin, checkNivel } = require('../middlewares/auth');

// Query base compatível com PostgreSQL
const queryJoin = `
    SELECT v.*, 
    TO_CHAR(v.data, 'DD-MM-YYYY') as data_formatada, -- Versão para exibir na tabela
    u1.nome as nome_saida, 
    u2.nome as nome_chegada,
    (v.quantidade * v.valor_unitario) as total_linha
    FROM vales v
    LEFT JOIN unidades u1 ON v.saida = u1.id
    LEFT JOIN unidades u2 ON v.chegada = u2.id
`;

// --- ROTA: FORMULÁRIO DE CADASTRO ---
router.get('/', checkAuth,checkModule('vales'), async (req, res) => {
    try {
        const unidadesRes = await db.query("SELECT * FROM unidades ORDER BY sigla");
        const usuariosRes = await db.query("SELECT * FROM usuarios ORDER BY nome");

        res.render('vales/cadastro', { 
            unidades: unidadesRes.rows, 
            usuarios: usuariosRes.rows, 
            usuarioLogado: req.session.user 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar dados de cadastro");
    }
});

// --- ROTA: PROCESSAR CADASTRO ---
router.post('/cadastrar', checkAuth, async (req, res) => {
    const { usuario, data, saida, chegada, quantidade, valor, motivo } = req.body;
    const query = `INSERT INTO vales (usuario, data, saida, chegada, quantidade, valor_unitario, motivo) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    
    try {
        await db.query(query, [usuario, data, saida, chegada, quantidade, valor, motivo]);
        res.redirect('/vales/relatorio?sucesso=1');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar vale");
    }
});

// --- ROTA: RELATÓRIO ---
router.get('/relatorio', checkAuth, async (req, res) => {
    const { usuario, mes } = req.query;
    
    let sql = `${queryJoin} WHERE v.status = 1`;
    let params = [];
    let paramCount = 1;

    if (usuario && usuario !== "") {
        sql += ` AND v.usuario = $${paramCount++}`;
        params.push(usuario);
    }

    if (mes && mes !== "") {
        // No Postgres usamos TO_CHAR para formatar a data
        sql += ` AND TO_CHAR(v.data, 'YYYY-MM') = $${paramCount++}`;
        params.push(mes);
    }

    sql += " ORDER BY v.data DESC";

    try {
        const usuariosRes = await db.query("SELECT * FROM usuarios ORDER BY nome");
        const valesRes = await db.query(sql, params);

        const rows = valesRes.rows;
        // Convertemos total_linha para número, pois o Postgres pode retornar NUMERIC como string
        rows.forEach(r => r.total_linha = parseFloat(r.total_linha));

        const totalGeral = rows.reduce((acc, curr) => acc + curr.total_linha, 0);
        const totalPago = rows.filter(r => r.pago === 1).reduce((acc, curr) => acc + curr.total_linha, 0);

        res.render('vales/relatorio', { 
            registros: rows, 
            totalGeral, 
            totalPago,
            totalPendente: totalGeral - totalPago,
            usuarios: usuariosRes.rows,
            filtroUsuario: usuario || "",
            filtroMes: mes || ""
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao processar relatório");
    }
});

// --- ROTA: AUTORIZAÇÃO ---
router.get('/autorizacao', checkAuth, checkAdmin,checkModule('vales'), checkNivel('vales', 'gerente'), async (req, res) => {
    try {
        const sql = `${queryJoin} ORDER BY v.data DESC`;
        const result = await db.query(sql);
        res.render('vales/autorizacao', { todosVales: result.rows });
    } catch (err) {
        res.status(500).send("Erro ao carregar autorizações");
    }
});

// --- ROTA: ALTERAR STATUS ---
router.post('/status/:id/:novoStatus', checkAuth, checkAdmin, async (req, res) => {
    const { id, novoStatus } = req.params;
    try {
        await db.query("UPDATE vales SET status = $1 WHERE id = $2", [novoStatus, id]);
        res.redirect('/vales/autorizacao');
    } catch (err) {
        res.status(500).send("Erro ao atualizar status");
    }
});

// --- ROTA: ALTERAR PAGAMENTO ---
router.post('/alternar-pagamento/:id', checkAuth, checkAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const checkRes = await db.query("SELECT pago FROM vales WHERE id = $1", [id]);
        if (checkRes.rows.length > 0) {
            const novoStatus = checkRes.rows[0].pago === 0 ? 1 : 0;
            await db.query("UPDATE vales SET pago = $1 WHERE id = $2", [novoStatus, id]);
        }
        res.redirect('/vales/relatorio');
    } catch (err) {
        res.status(500).send("Erro ao processar pagamento");
    }
});

// --- ROTA: EXPORTAR CSV ---
router.get('/relatorio/exportar', checkAuth, async (req, res) => {
    const { usuario, mes, pendentes } = req.query;

    let sql = `${queryJoin} WHERE v.status = 1`;
    let params = [];
    let paramCount = 1;

    if (pendentes !== 'true') {
        sql += " AND v.pago = 1";
    }

    if (usuario && usuario !== "") {
        sql += ` AND v.usuario = $${paramCount++}`;
        params.push(usuario);
    }

    if (mes && mes !== "") {
        sql += ` AND TO_CHAR(v.data, 'YYYY-MM') = $${paramCount++}`;
        params.push(mes);
    }

    sql += " ORDER BY v.data ASC";

    try {
        const result = await db.query(sql, params);
        const rows = result.rows;

        let csv = 'Colaborador;Data;Saida;Chegada;Motivo;Pagamento;Total (R$)\n';

        rows.forEach(r => {
            const total = parseFloat(r.total_linha).toFixed(2);
            const statusPagamento = r.pago === 1 ? 'PAGO' : 'PENDENTE';
            // Formatação de data simples para CSV
            csv += `${r.usuario};${r.data_formatada};${r.nome_saida};${r.nome_chegada};${r.motivo || 'N/A'};${statusPagamento};${total}\n`;
        });

        const fileName = `relatorio_vales_${mes || 'geral'}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send('\uFEFF' + csv);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao gerar relatório");
    }
});

module.exports = router;