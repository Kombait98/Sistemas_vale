

# Sistemas Vale 🚀

Sistema modular para gestão de recursos corporativos, desenvolvido com foco em escalabilidade, segurança e interface intuitiva. Originalmente concebido para o controle de vales-transporte, o ecossistema está sendo expandido para gestão de viagens (Travels) e fluxos financeiros.

## 🛠️ Stack Tecnológica

* **Backend:** Node.js com Express.js
* **Banco de Dados:** PostgreSQL (Migrado de SQLite para alta performance)
* **Frontend:** EJS (Embedded JavaScript), Bootstrap 5 e SweetAlert2
* **Autenticação:** Express-Session & BcryptJS
* **Infraestrutura:** Suporte a variáveis de ambiente (`dotenv`)

---

## ✨ Funcionalidades Principais

### 🔐 Gestão de Acessos Avançada
* **Permissões JSONB:** Implementação de controle de acesso modular armazenado em formato JSON diretamente no banco de dados.
* **Níveis Hierárquicos:** Distinção entre *Administrador Geral*, *Gerente de Módulo* e *Colaborador*.
* **Contextualização de Interface:** A Navbar e os menus se adaptam dinamicamente aos privilégios do usuário logado.

### 🎫 Módulo de Vales
* **Fluxo de Aprovação:** Cadastro de solicitações com status de "Pendente", "Autorizado" ou "Recusado".
* **Gestão Financeira:** Controle de pagamentos integrado.
* **Relatórios Dinâmicos:** Filtros por colaborador e competência (mês/ano).
* **Exportação:** Geração de relatórios em CSV otimizados para Excel (com suporte a acentuação PT-BR).

---

## 🚀 Como Executar o Projeto

### 1. Requisitos
* Node.js instalado.
* Instância do PostgreSQL ativa.

### 2. Configuração do Banco de Dados
Execute o script de inicialização para criar as tabelas e o usuário administrador inicial:
```sql
-- O sistema utiliza campos SERIAL para IDs e JSONB para permissões
-- 1. CRIAÇÃO DO USUÁRIO DA APLICAÇÃO (Execute como superusuário postgres)
-- Se o usuário já existir, este comando pode ser ignorado ou adaptado
-- CREATE USER "lg-vales" WITH PASSWORD 'sua_senha_aqui';

-- 2. CRIAÇÃO DO BANCO DE DADOS
-- Nota: No PostgreSQL, comandos de criação de banco não podem rodar dentro de transações.
CREATE DATABASE sistemas_vale;

-- 3. CONEXÃO AO BANCO (No psql, use \c sistemas_vale. No pgAdmin, abra uma nova Query Tool no banco criado)

-- 4. CRIAÇÃO DAS TABELAS

-- Tabela de Unidades
CREATE TABLE IF NOT EXISTS unidades (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(10) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL
);

-- Tabela de Usuários (Com suporte a JSONB para permissões modulares)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    senha TEXT NOT NULL,
    permissao VARCHAR(20) DEFAULT 'colaborador', -- 'admin' ou 'colaborador'
    permissoes JSONB DEFAULT '{
        "vales": {"acesso": false, "nivel": "colaborador"},
        "travels": {"acesso": false, "nivel": "colaborador"}
    }'
);

-- Tabela de Vales
CREATE TABLE IF NOT EXISTS vales (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100),
    data DATE NOT NULL,
    saida INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
    chegada INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario NUMERIC(10, 2) NOT NULL,
    motivo TEXT,
    pago INTEGER DEFAULT 0, -- 0: Pendente, 1: Pago
    status INTEGER DEFAULT 0 -- 0: Pendente, 1: Autorizado, 2: Recusado
);

-- 5. CONFIGURAÇÃO DE PERMISSÕES PARA O USUÁRIO "lg-vales"
GRANT ALL PRIVILEGES ON DATABASE sistemas_vale TO "lg-vales";
GRANT USAGE ON SCHEMA public TO "lg-vales";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "lg-vales";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "lg-vales";

-- Garante que o usuário da aplicação seja o dono dos objetos para evitar erros de permissão futura
ALTER SCHEMA public OWNER TO "lg-vales";
ALTER TABLE unidades OWNER TO "lg-vales";
ALTER TABLE usuarios OWNER TO "lg-vales";
ALTER TABLE vales OWNER TO "lg-vales";

-- 6. DADOS INICIAIS (OPCIONAL)
-- Insira aqui suas unidades padrão
INSERT INTO unidades (sigla, nome) VALUES 
('MAT', 'Matriz'),
('CORP', 'Corporativo')
ON CONFLICT DO NOTHING;
);
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
DB_USER=seu_usuario
DB_HOST=localhost
DB_NAME=sistemas_vale
DB_PASS=sua_senha
DB_PORT=5432
APP_SECRET=sua_chave_secreta_para_sessao
```

### 4. Instalação
```bash
# Instalar dependências
npm install

# Iniciar o servidor
node app.js
```

---

## 📂 Estrutura do Projeto
```text
├── middlewares/    # Proteção de rotas e validação de módulos
├── partials/       # Componentes reutilizáveis (Navbar, Header, Footer)
├── public/         # Arquivos estáticos (CSS, JS, Imagens)
├── routes/         # Lógica de rotas dividida por módulos (Auth, Vales, Travels)
├── views/          # Templates EJS
└── database.js     # Configuração do Pool de conexão PostgreSQL
```

---

## 🛠️ Próximos Passos (Roadmap)
- [ ] Finalização do módulo **Travels** (Quilometragem e Gastos).
- [ ] Implementação de Dashboards gráficos na Home.
- [ ] Integração de Logs de auditoria para ações de gerentes.

---

