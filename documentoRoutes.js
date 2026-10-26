const express = require('express');
const router = express.Router();

const controller = require('../controllers/processoControllers');
const auth = require('../middlewares/auth.js');

const multer = require('multer');

// =========================
// CONFIGURAÇÃO DE UPLOAD
// =========================
// Antes: upload = multer({ dest: 'uploads/' }) — sem limite de tamanho,
// sem limite de quantidade de ficheiros, e sem restrição de tipo.
// Qualquer pessoa autenticada como técnico/admin conseguia enviar
// ficheiros de qualquer tamanho e qualquer formato (incluindo .exe).
//
// Agora só aceitamos os formatos que fazem sentido para este sistema,
// com um limite de tamanho por ficheiro e de quantidade por pedido.
// Ajuste TIPOS_PERMITIDOS/TAMANHO_MAXIMO_MB conforme a necessidade real.

const TIPOS_PERMITIDOS = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const TAMANHO_MAXIMO_MB = 10;
const MAX_FICHEIROS = 10;

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024,
        files: MAX_FICHEIROS
    },
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            return cb(new Error(
                `Tipo de ficheiro não permitido: ${file.mimetype}. ` +
                `Tipos aceites: PDF, JPG, PNG, DOC, DOCX.`
            ));
        }
        cb(null, true);
    }
});


// ================= PROCESSO CRIAR (PROTEGIDO) =================
router.post(
  '/',
  auth.verificarToken,
  auth.soTecnicoOuAdmin,
  upload.array('ficheiros'),
  controller.criarDocumento
);

// ================= DELETE PROCESSO (SÓ ADMIN) =================
router.delete(
  '/:id',
  auth.verificarToken,
  auth.soAdmin,
  controller.excluirDocumento
);


router.get(
    '/logs',
    auth.verificarToken,
    auth.soAdmin,
    controller.listarLogs
);


// ================= OUTRAS ROTAS =================
router.get('/', auth.verificarToken, controller.listarDocumentos);

router.get('/:id/completo', auth.verificarToken, controller.verProcessoCompleto);

router.get('/:id', auth.verificarToken, controller.verDocumento);

router.put('/:id', auth.verificarToken, controller.editarDocumento);



router.post(
  '/:id/documentos',
  auth.verificarToken,
  auth.soTecnicoOuAdmin,
  upload.array('ficheiros'),
  controller.adicionarDocumentos
);

router.delete(
  '/documento/:id',
  auth.verificarToken,
  auth.soTecnicoOuAdmin,
  controller.eliminarDocumentoUnico
);

router.delete(
  '/:id/documentos',
  auth.verificarToken,
  auth.soAdmin,
  controller.eliminarTodosDocumentos
);


// A rota de preview não tem 'verificarToken' porque é usada dentro de um
// <iframe> no frontend, que não consegue enviar o cabeçalho Authorization.
// Ver a nota de segurança em previewDocumento (processoControllers.js).
//
// NOTA: a rota estava duplicada no ficheiro original (definida duas vezes
// com o mesmo caminho) — mantida aqui só uma vez.
router.get(
  '/preview/:id',
  controller.previewDocumento
);

router.get('/download/:id', auth.verificarToken, controller.downloadDocumento);

module.exports = router;