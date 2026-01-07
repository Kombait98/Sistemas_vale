Sistema de Conferência de Vales de Passagens 🚌
Este é um sistema web robusto e leve desenvolvido para a gestão, autorização e conferência financeira de vales de deslocamento de colaboradores.

O projeto foi construído com foco em segurança de dados e workflow de aprovação, garantindo que apenas registros autorizados pelo gestor entrem nos cálculos financeiros finais.

🛠️ Tecnologias Utilizadas
Backend & Banco de Dados
Node.js: Ambiente de execução Javascript no servidor.

Express: Framework para gestão de rotas e middlewares.

SQLite3: Banco de dados relacional local, ideal para portabilidade e performance.

Bcrypt: Criptografia de senhas para segurança de credenciais.

Express-Session: Controle de sessões e autenticação de usuários.

Dotenv: Gestão de variáveis de ambiente.

Frontend
EJS (Embedded JavaScript Templates): Renderização dinâmica de HTML no servidor.

Bootstrap 5: Framework CSS para design responsivo e moderno.

Bootstrap Icons: Ícones para interface intuitiva (Tooltips de chat, alertas, etc).

🚀 Como Executar o Projeto
1. Pré-requisitos
Node.js (Versão LTS recomendada).

Git para versionamento.

2. Configuração no Windows (Desenvolvimento)
Clone o repositório:

```
git clone https://github.com/Kombait98/Sistemas_vale.git
cd Sistemas_vale
```
Instale as dependências:

```
npm install
```
Crie um arquivo .env na raiz do projeto (use o .env.example como base):
```Plaintext
PORT=3000
APP_SECRET=sua_chave_secreta_aqui
DB_PATH=./database.sqlite
```
Inicie o servidor:

```
node app.js
```
3. Primeiro Acesso (Admin)
Na primeira execução, o sistema cria automaticamente o usuário administrador:

Login: admin

Senha: O valor definido no campo APP_SECRET do seu arquivo .env.

🐧 Deploy no Ubuntu Server (Produção)
Para rodar em um servidor Linux de forma contínua:

Instale o PM2 globalmente:

```
sudo npm install -g pm2
```
Inicie a aplicação com PM2:

```
pm2 start app.js --name "sistemas-vale"
```
Para atualizar o servidor após alterações no Git:

```
git pull origin main
npm install
pm2 restart sistemas-vale
```
📂 Estrutura do Projeto
```Plaintext

Sistemas_vale/
├── views/              # Telas em EJS
│   ├── partials/       # Componentes reutilizáveis (Navbar)
│   ├── cadastro.ejs    # Tela de lançamento de vales
│   ├── login.ejs       # Tela de autenticação
│   ├── relatorio.ejs   # Conferência financeira e filtros
│   └── autorizacao.ejs # Gestão de workflow e status
├── app.js              # Servidor Express e rotas
├── database.js         # Configuração do SQLite e Tabelas
├── .env                # Variáveis de ambiente (ignorado pelo Git)
└── .gitignore          # Filtro de arquivos para o repositório
```
⚙️ Regras de Negócio e Funcionalidades
Identificação Automática: O sistema identifica o colaborador logado e vincula seu nome automaticamente ao cadastro do vale.

Workflow de Status:

Pendente: Estado inicial após o cadastro.
Autorizado: Somente estes aparecem no relatório financeiro.
Recusado: Mantido no histórico, mas ignorado nos cálculos.
Gestão de Unidades: Cadastro via Sigla (Ex: SPO) com exibição automática do Nome Completo (Ex: São Paulo - Matriz) nos relatórios via SQL Joins.
Segurança: Senhas criptografadas e proteção de rotas (checkAuth e checkAdmin).
Tooltips Dinâmicos: Observações e motivos de deslocamento são exibidos ao passar o mouse sobre o ícone de chat.
