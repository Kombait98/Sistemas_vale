

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
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    login TEXT UNIQUE,
    permissoes JSONB DEFAULT '{"vales": {"acesso": false, "nivel": "colaborador"}}'
    -- ... outros campos
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

