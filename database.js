const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// 1. Configuração de Variáveis de Ambiente
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new sqlite3.Database(dbPath);

console.log("Caminho do projeto:", __dirname);
console.log("Variável APP_SECRET carregada:", process.env.APP_SECRET ? "Sim" : "Nao");

// 2. Inicialização do Banco de Dados
db.serialize(() => {
    
    // --- Tabela de Vales ---
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

    // Atualizações de Schema (Adição de colunas caso não existam)
    db.run("ALTER TABLE vales ADD COLUMN pago INTEGER DEFAULT 0", (err) => {
        if (err) { /* Coluna já existe */ }
    });
    db.run("ALTER TABLE vales ADD COLUMN status INTEGER DEFAULT 0", (err) => {
        if (err) { /* Coluna já existe */ }
    });

    // --- Tabela de Usuários ---
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        nome TEXT,
        senha TEXT,
        permissao TEXT DEFAULT 'colaborador'
    )`, async () => {
        
        // Criar o usuário ADMIN automático se não existir
        const adminLogin = 'admin';
        const adminSenha = process.env.APP_SECRET; 
        
        if (adminSenha) {
            db.get("SELECT * FROM usuarios WHERE login = ?", [adminLogin], async (err, row) => {
                if (!row) {
                    try {
                        const hash = await bcrypt.hash(adminSenha, 10);
                        db.run("INSERT INTO usuarios (login, nome, senha, permissao) VALUES (?, ?, ?, ?)",
                            [adminLogin, 'Administrador do Sistema', hash, 'admin']);
                        console.log("Usuário ADMIN criado com sucesso.");
                    } catch (e) {
                        console.error("Erro ao gerar senha do ADMIN:", e);
                    }
                }
            });
        }
    });

    // --- Tabela de Unidades ---
    db.run(`CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sigla TEXT UNIQUE,
        nome TEXT
    )`);

});

module.exports = db;