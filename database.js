const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

const initDB = async () => {
    try {
        // Tabela de Unidades
        await pool.query(`
            CREATE TABLE IF NOT EXISTS unidades (
                id SERIAL PRIMARY KEY,
                sigla TEXT UNIQUE NOT NULL,
                nome TEXT NOT NULL
            )
        `);

        // Tabela de Usuários
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                login TEXT UNIQUE NOT NULL,
                nome TEXT NOT NULL,
                senha TEXT NOT NULL,
                permissao TEXT DEFAULT 'colaborador'
            )
        `);

        // Tabela de Vales
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vales (
                id SERIAL PRIMARY KEY,
                usuario TEXT,
                data DATE,
                saida INTEGER REFERENCES unidades(id),
                chegada INTEGER REFERENCES unidades(id),
                quantidade INTEGER,
                valor_unitario NUMERIC(10,2),
                motivo TEXT,
                pago INTEGER DEFAULT 0,
                status INTEGER DEFAULT 0
            )
        `);

        // Criar Admin Inicial se não existir
        const adminCheck = await pool.query("SELECT * FROM usuarios WHERE login = 'admin'");
        if (adminCheck.rowCount === 0) {
            const hash = await bcrypt.hash(process.env.APP_SECRET, 10);
            await pool.query(
                "INSERT INTO usuarios (login, nome, senha, permissao) VALUES ($1, $2, $3, $4)",
                ['admin', 'Administrador', hash, 'admin']
            );
            console.log("✅ Usuário ADMIN criado no PostgreSQL.");
        }

        console.log("🚀 Tabelas verificadas/criadas com sucesso no Postgres.");
    } catch (err) {
        console.error("❌ Erro ao inicializar o Postgres:", err.message);
    }
};

initDB();

module.exports = pool;