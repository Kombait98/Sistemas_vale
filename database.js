const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // Tabela de Vales (já existente)
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

    // NOVA: Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )`);
    db.run("ALTER TABLE vales ADD COLUMN pago INTEGER DEFAULT 0", (err) => {
        if (err) {
            // Se der erro é porque a coluna provavelmente já existe, podemos ignorar
        }
    });
    db.run("ALTER TABLE vales ADD COLUMN status INTEGER DEFAULT 0", (err) => { });
    db.run(`CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sigla TEXT UNIQUE,
        nome TEXT
    )`);
});

module.exports = db;