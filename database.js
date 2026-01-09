const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log("Caminho do projeto:", __dirname);
console.log("Variável APP_SECRET carregada:", process.env.APP_SECRET ? "Sim" : "Nao");const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database.sqlite';
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
    // Tabela de Vales
    db.run(`CREATE TABLE IF NOT EXISTS vales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        data TEXT,
        saida TEXT,
        chegada TEXT,
        quantidade INTEGER,
        valor_unitario REAL,
        motivo TEXT
    )`);
    db.run("ALTER TABLE vales ADD COLUMN pago INTEGER DEFAULT 0", (err) => {
        if (err) {}
    });
    db.run("ALTER TABLE vales ADD COLUMN status INTEGER DEFAULT 0", (err) => { });

    //Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        nome TEXT,
        senha TEXT,
        permissao TEXT DEFAULT 'colaborador' -- 'admin' ou 'colaborador'
    )`, async () => {
        // Criar o usuário ADMIN se não existir
        const adminLogin = 'admin';
        const adminSenha = process.env.APP_SECRET; // Senha vinda do .env
        
        db.get("SELECT * FROM usuarios WHERE login = ?", [adminLogin], async (err, row) => {
            if (!row && adminSenha) {
                const hash = await bcrypt.hash(adminSenha, 10);
                db.run("INSERT INTO usuarios (login, nome, senha, permissao) VALUES (?, ?, ?, ?)",
                    [adminLogin, 'Administrador do Sistema', hash, 'admin']);
                console.log("Usuário ADMIN criado com sucesso.");
            }
        });
    });

    //Tabela de Unidades
    db.run(`CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sigla TEXT UNIQUE,
        nome TEXT
    )`);
});

module.exports = db;