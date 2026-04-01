// middlewares/auth.js
module.exports = {
    // 1. Verifica apenas se o usuário está logado (Geral)
    checkAuth: (req, res, next) => {
        if (req.session.user) {
            return next();
        }
        res.redirect('/login');
    },

    // 2. Verifica se o usuário é Administrador Geral (Para gerir usuários/unidades)
    checkAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.permissao === 'admin') {
            return next();
        }
        res.status(403).send("Acesso negado: Somente administradores do sistema.");
    },

    // 3. NOVO: Verifica se o usuário tem ACESSO a um módulo específico (Vales ou Travels)
    checkModule: (modulo) => {
        return (req, res, next) => {
            const user = req.session.user;
            
            // Verifica se o objeto de permissões existe e se o acesso ao módulo é 'true'
            if (user && user.permissoes && user.permissoes[modulo] && user.permissoes[modulo].acesso) {
                return next();
            }
            
            res.status(403).render('error', { 
                mensagem: `Você não tem permissão para acessar o módulo: ${modulo.toUpperCase()}` 
            });
            // Nota: Se não tiver a view 'error', use res.status(403).send(...)
        };
    },

    // 4. NOVO: Verifica o NÍVEL dentro do módulo (Gerente ou Colaborador)
    checkNivel: (modulo, nivelRequerido) => {
        return (req, res, next) => {
            const user = req.session.user;

            if (user && user.permissoes && user.permissoes[modulo] && user.permissoes[modulo].nivel === nivelRequerido) {
                return next();
            }

            res.status(403).send(`Acesso negado: Este recurso exige nível de ${nivelRequerido} no módulo ${modulo}.`);
        };
    }
};