const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

require('./db');

const app = express();

// =========================
// CORS
// =========================
// cors() sem opções permite pedidos de qualquer origem. Para produção,
// é mais seguro restringir a uma lista de domínios conhecidos, ex.:
//
// app.use(cors({ origin: ["https://anres.exemplo.st"] }));
//
// Mantido aberto aqui para não partir o ambiente de desenvolvimento atual.
app.use(cors());

app.use(express.json({ limit: '2mb' }));

app.use(express.static('public'));
app.use(
    '/Imagens',
    express.static(
        path.join(__dirname, 'Imagens')
    )
);

// =========================
// ATENÇÃO — CORREÇÃO DE SEGURANÇA
// =========================
// Antes, a pasta 'uploads/' era servida como estática:
//
//   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//
// Isto significava que qualquer pessoa que soubesse (ou adivinhasse) o
// nome interno de um ficheiro conseguia aceder-lhe diretamente por
// http://.../uploads/nome-do-ficheiro — SEM LOGIN e sem passar pelas
// rotas /documentos/download/:id ou /documentos/preview/:id. Ou seja,
// contornava totalmente a autenticação e as permissões de utilizador.
//
// A linha foi removida. Os documentos só devem ser acedidos através
// dessas duas rotas controladas, que verificam existência e (no caso do
// download) autenticação.
//
// Se precisar de servir outros ficheiros estáticos que não sejam
// confidenciais, use uma pasta própria só para esse fim — nunca a mesma
// pasta onde ficam os documentos dos processos.


// ROTAS
const documentoRoutes =
require('./routes/documentoRoutes');

const authRoutes =
require('./routes/authRoutes');

app.use('/documentos', documentoRoutes);

const notificacaoRoutes =
require('./routes/notificacaoRoutes');

app.use(
    '/notificacao',
    notificacaoRoutes
);

app.use('/auth', authRoutes);

const backupRoutes =
require("./routes/backupRoutes");

app.use("/backup", backupRoutes);

const restoreRoutes =
require("./routes/restoreRoutes");

app.use("/restore", restoreRoutes);

const relatorioRoutes = require("./routes/relatorioRoutes");

app.use("/relatorio", relatorioRoutes);

// =========================
// TRATAMENTO DE ERROS (GLOBAL)
// =========================
// Antes não existia nenhum middleware de erro. Um erro do multer
// (ficheiro grande demais, tipo não permitido, etc.) ou qualquer erro
// não apanhado explicitamente por um controller resultava numa página
// de erro HTML genérica do Express — o frontend não conseguia
// interpretar isso como JSON.
app.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                erro: 'Um ou mais ficheiros excedem o tamanho máximo permitido (10MB).'
            });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                erro: 'Demasiados ficheiros enviados de uma vez (máximo 10).'
            });
        }

        return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
    }

    if (err && err.message && err.message.startsWith('Tipo de ficheiro não permitido')) {
        return res.status(400).json({ erro: err.message });
    }

    console.error('Erro não tratado:', err);

    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(3000, () => {

    console.log(
        'Servidor rodando em http://localhost:3000'
    );

});