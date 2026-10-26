const jwt = require('jsonwebtoken');

const SEGREDO = 'SEGREDO_SUPER_SECRET';

// =========================
// VERIFICAR TOKEN
// =========================
exports.verificarToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Token não fornecido' });
    }

    // formato: Bearer TOKEN
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensagem: 'Token inválido' });
    }

    try {
        const decoded = jwt.verify(token, SEGREDO);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
};


// =========================
// SÓ ADMIN
// =========================
exports.soAdmin = (req, res, next) => {

    if (!req.user || req.user.tipo !== 'admin') {
        return res.status(403).json({ mensagem: 'Acesso negado (apenas admin)' });
    }

    next();
};


// =========================
// ADMIN OU TECNICO
// =========================
exports.soTecnicoOuAdmin = (req, res, next) => {

    if (!req.user || (req.user.tipo !== 'admin' && req.user.tipo !== 'tecnico')) {
        return res.status(403).json({ mensagem: 'Acesso negado (admin ou técnico apenas)' });
    }

    next();
};


// =========================
// QUALQUER UTILIZADOR AUTENTICADO
// =========================
exports.soAutenticado = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }

    next();
};

