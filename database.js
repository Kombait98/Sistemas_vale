require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database.sqlite';
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

    //Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )`);
    db.run("ALTER TABLE vales ADD COLUMN pago INTEGER DEFAULT 0", (err) => {
        if (err) {}
    });
    db.run("ALTER TABLE vales ADD COLUMN status INTEGER DEFAULT 0", (err) => { });
    //Tabela de Unidades
    db.run(`CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sigla TEXT UNIQUE,
        nome TEXT
    )`);
});

module.exports = db;