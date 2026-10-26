const express = require('express');
const router = express.Router();

const controller =
require('../controllers/notificacaoController');

const auth =
require('../middlewares/auth');

/* Listar notificações */
router.get(
    '/',
    auth.verificarToken,
    controller.listarNotificacao
);

module.exports = router;