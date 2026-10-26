
const db = require('../db');
const path = require('path');
const fs = require('fs');
const logs = require('./logsController');
const notificacao = require('./notificacaoController');
const { validarProcesso } = require('../utils/validarProcesso');

// =========================
// HELPER: PROMISIFICAR db.query
// =========================
// O projeto usa a API de callbacks do driver MySQL. Este wrapper permite
// usar async/await (e por isso try/catch normal) sem mudar nada na forma
// como a ligação à base de dados está configurada em '../db'.
function executarQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// =========================
// HELPER: VALIDAR ID NUMÉRICO DE ROTA
// =========================
function idValido(valor) {
    return /^[0-9]+$/.test(String(valor));
}

// =========================
// GERAR ID
// =========================
function gerarID(nome, data) {

    const ano = new Date(data).getFullYear();

    const num = Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0');

    return `D.nº ${num}/ANRES/${ano} - ${nome}`;
}

// =========================
// NORMALIZAR DADOS DO BODY
// =========================
function normalizarDados(body) {
    return {
        nome_requerente: body.nome_requerente ? String(body.nome_requerente).trim() : null,
        numero_deliberacao: body.numero_deliberacao ? String(body.numero_deliberacao).trim() : null,
        numero_processo: body.numero_processo ? String(body.numero_processo).trim() : null,
        pais_emissor: body.pais_emissor ? String(body.pais_emissor).trim() : null,

        instituicao: body.instituicao ? String(body.instituicao).trim() : null,
        designacao: body.designacao ? String(body.designacao).trim() : null,
        data_inicio_curso: body.data_inicio_curso || null,
        data_conclusao_curso: body.data_conclusao_curso || null,
        bi: body.bi ? String(body.bi).trim() : null,

        data_entrada: body.data_entrada || null,
        tipo_documento: body.tipo_documento || null,
        genero: body.genero || null,
        grau_academico: body.grau_academico || null,
        estado: body.estado || 'Em Trâmite',
        continente: body.continente || null
    };
}

// =========================
// APAGAR FICHEIROS ÓRFÃOS
// =========================
// Se a validação falhar depois de o multer já ter gravado os ficheiros
// em disco, é preciso limpá-los — senão ficam ficheiros "fantasma" na
// pasta uploads/ sem nenhum processo associado.
function limparFicheirosEnviados(files) {
    if (!files || files.length === 0) return;

    files.forEach(file => {
        if (fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (erroLimpeza) {
                console.log("Erro ao limpar ficheiro órfão:", erroLimpeza);
            }
        }
    });
}

// =========================
// CRIAR PROCESSO
// =========================
exports.criarDocumento = async (req, res) => {

    const d = normalizarDados(req.body);

    // =========================
    // VALIDAÇÃO COMPLETA
    // =========================
    const erros = validarProcesso(d);

    if (erros.length > 0) {
        limparFicheirosEnviados(req.files);
        return res.status(400).json({
            erro: "Dados inválidos",
            detalhes: erros
        });
    }

    const id_formatado = gerarID(d.nome_requerente, d.data_entrada);

    try {

        const resultado = await executarQuery(`
            INSERT INTO processos(
                id_formatado,
                nome_requerente,
                numero_deliberacao,
                numero_processo,
                pais_emissor,
                instituicao,
                designacao,
                data_inicio_curso,
                data_conclusao_curso,
                bi,
                data_entrada,
                tipo_documento,
                genero,
                grau_academico,
                estado,
                continente
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
            id_formatado,
            d.nome_requerente,
            d.numero_deliberacao,
            d.numero_processo,
            d.pais_emissor,
            d.instituicao,
            d.designacao,
            d.data_inicio_curso,
            d.data_conclusao_curso,
            d.bi,
            d.data_entrada,
            d.tipo_documento,
            d.genero,
            d.grau_academico,
            d.estado,
            d.continente
        ]);

        const processoId = resultado.insertId;

        notificacao.criarNotificacao(
            'PROCESSO',
            `Novo processo criado: ${d.nome_requerente}`
        );

        logs.registarLog(
            req.user.id,
            processoId,
            "CRIAR",
            `Criou o processo ${id_formatado}`
        );

        // =========================
        // INSERIR FICHEIROS (SE EXISTIREM)
        // =========================
        // Antes, cada insert corria de forma independente (fire-and-forget)
        // e qualquer erro só ia parar à consola — o utilizador nunca ficava
        // a saber se um documento falhou ao ser guardado. Agora esperamos
        // por cada insert e devolvemos essa informação na resposta.
        const falhasFicheiros = [];

        if (req.files && req.files.length > 0) {

            for (const file of req.files) {
                try {
                    await executarQuery(`
                        INSERT INTO documentos(
                            processo_id,
                            nome_original,
                            nome_arquivo,
                            caminho,
                            tamanho,
                            tipo_arquivo
                        )
                        VALUES(?,?,?,?,?,?)
                    `, [
                        processoId,
                        file.originalname,
                        file.filename,
                        file.path,
                        file.size,
                        file.mimetype
                    ]);
                } catch (erroFicheiro) {
                    console.log("Erro ao inserir ficheiro:", erroFicheiro);
                    falhasFicheiros.push(file.originalname);
                }
            }
        }

        // =========================
        // RESPOSTA FINAL
        // =========================
        return res.json({
            mensagem: falhasFicheiros.length > 0
                ? 'Processo criado, mas alguns documentos falharam ao ser guardados.'
                : 'Processo criado com sucesso',
            id_formatado,
            processo_id: processoId,
            ficheiros_com_falha: falhasFicheiros
        });

    } catch (err) {
        limparFicheirosEnviados(req.files);
        return res.status(500).json({
            erro: "Erro ao criar processo",
            detalhe: err.message
        });
    }
};

// =========================
// LISTAR PROCESSOS
// =========================
exports.listarDocumentos = async (req, res) => {
    try {
        const result = await executarQuery('SELECT * FROM processos ORDER BY id DESC');
        res.json(result);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao listar processos", detalhe: err.message });
    }
};

// =========================
// VER PROCESSO
// =========================
exports.verDocumento = async (req, res) => {

    if (!idValido(req.params.id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        const result = await executarQuery('SELECT * FROM processos WHERE id=?', [req.params.id]);

        if (result.length === 0) {
            return res.status(404).json({ erro: "Processo não encontrado" });
        }

        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao obter processo", detalhe: err.message });
    }
};

// =========================
// VER PROCESSO COMPLETO
// =========================
exports.verProcessoCompleto = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        const proc = await executarQuery('SELECT * FROM processos WHERE id=?', [id]);

        if (proc.length === 0) {
            return res.status(404).json({ erro: "Processo não encontrado" });
        }

        const docs = await executarQuery('SELECT * FROM documentos WHERE processo_id=?', [id]);

        logs.registarLog(
            req.user.id,
            id,
            "VISUALIZAR",
            `Visualizou o processo ID ${id}`
        );

        res.json({
            processo: proc[0],
            documentos: docs
        });

    } catch (err) {
        res.status(500).json({ erro: "Erro ao obter processo completo", detalhe: err.message });
    }
};

// =========================
// EDITAR PROCESSO
// =========================
exports.editarDocumento = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    const d = normalizarDados(req.body);

    // Antes não havia QUALQUER validação na edição — dava para gravar um
    // processo com datas inválidas, estado inexistente, etc. Agora usa
    // exatamente as mesmas regras da criação.
    const erros = validarProcesso(d);

    if (erros.length > 0) {
        return res.status(400).json({
            erro: "Dados inválidos",
            detalhes: erros
        });
    }

    try {

        const existente = await executarQuery('SELECT id FROM processos WHERE id=?', [id]);

        if (existente.length === 0) {
            return res.status(404).json({ erro: "Processo não encontrado" });
        }

        await executarQuery(
            `UPDATE processos SET
                nome_requerente=?,
                numero_deliberacao=?,
                numero_processo=?,
                pais_emissor=?,
                instituicao=?,
                designacao=?,
                data_inicio_curso=?,
                data_conclusao_curso=?,
                bi=?,
                data_entrada=?,
                tipo_documento=?,
                genero=?,
                grau_academico=?,
                estado=?,
                continente=?
            WHERE id=?`,
            [
                d.nome_requerente,
                d.numero_deliberacao,
                d.numero_processo,
                d.pais_emissor,
                d.instituicao,
                d.designacao,
                d.data_inicio_curso,
                d.data_conclusao_curso,
                d.bi,
                d.data_entrada,
                d.tipo_documento,
                d.genero,
                d.grau_academico,
                d.estado,
                d.continente,
                id
            ]
        );

        notificacao.criarNotificacao(
            'EDIÇÃO',
            `Processo ${id} foi editado`
        );

        logs.registarLog(
            req.user.id,
            id,
            "EDITAR",
            `Editou o processo ID ${id}`
        );

        res.json({ mensagem: 'Processo atualizado' });

    } catch (err) {
        console.log("ERRO MYSQL:", err);
        res.status(500).json({ erro: "Erro ao editar processo", detalhe: err.message });
    }
};

// =========================
// ADICIONAR DOCUMENTOS A PROCESSO EXISTENTE
// =========================
exports.adicionarDocumentos = async (req, res) => {

    const processoId = req.params.id;

    if (!idValido(processoId)) {
        limparFicheirosEnviados(req.files);
        return res.status(400).json({ erro: "ID inválido" });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ erro: "Nenhum ficheiro enviado" });
    }

    try {

        const existente = await executarQuery('SELECT id FROM processos WHERE id=?', [processoId]);

        if (existente.length === 0) {
            limparFicheirosEnviados(req.files);
            return res.status(404).json({ erro: "Processo não encontrado" });
        }

        const falhas = [];

        for (const file of req.files) {
            try {
                await executarQuery(`
                    INSERT INTO documentos (
                        processo_id,
                        nome_original,
                        nome_arquivo,
                        caminho,
                        tamanho,
                        tipo_arquivo
                    ) VALUES (?,?,?,?,?,?)
                `, [
                    processoId,
                    file.originalname,
                    file.filename,
                    file.path,
                    file.size,
                    file.mimetype
                ]);
            } catch (erroFicheiro) {
                console.log("Erro ao inserir ficheiro:", erroFicheiro);
                falhas.push(file.originalname);
            }
        }

        res.json({
            mensagem: falhas.length > 0
                ? "Alguns documentos falharam ao ser guardados"
                : "Documentos adicionados com sucesso",
            ficheiros_com_falha: falhas
        });

    } catch (err) {
        limparFicheirosEnviados(req.files);
        res.status(500).json({ erro: "Erro ao adicionar documentos", detalhe: err.message });
    }
};

// =========================
// ELIMINAR TODOS DOCUMENTOS
// =========================
exports.eliminarTodosDocumentos = async (req, res) => {

    const processoId = req.params.id;

    if (!idValido(processoId)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {

        const docs = await executarQuery('SELECT * FROM documentos WHERE processo_id=?', [processoId]);

        docs.forEach(doc => {
            if (fs.existsSync(doc.caminho)) {
                try {
                    fs.unlinkSync(doc.caminho);
                } catch (erroFs) {
                    console.log("Erro ao apagar ficheiro do disco:", erroFs);
                }
            }
        });

        await executarQuery('DELETE FROM documentos WHERE processo_id=?', [processoId]);

        res.json({ mensagem: 'Todos os documentos eliminados' });

    } catch (err) {
        res.status(500).json({ erro: "Erro ao eliminar documentos", detalhe: err.message });
    }
};

// =========================
// ELIMINAR DOCUMENTO ÚNICO
// =========================
exports.eliminarDocumentoUnico = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {

        const result = await executarQuery('SELECT * FROM documentos WHERE id=?', [id]);

        if (result.length === 0) {
            return res.status(404).json({ erro: "Documento não encontrado" });
        }

        const doc = result[0];

        if (fs.existsSync(doc.caminho)) {
            fs.unlinkSync(doc.caminho);
        }

        await executarQuery('DELETE FROM documentos WHERE id=?', [id]);

        res.json({ mensagem: "Documento eliminado com sucesso" });

    } catch (err) {
        res.status(500).json({ erro: "Erro ao eliminar documento", detalhe: err.message });
    }
};

// =========================
// ELIMINAR PROCESSO
// =========================
exports.excluirDocumento = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {

        const existente = await executarQuery('SELECT id FROM processos WHERE id=?', [id]);

        if (existente.length === 0) {
            return res.status(404).json({ erro: "Processo não encontrado" });
        }

        // Elimina também os ficheiros físicos associados, para não deixar
        // ficheiros órfãos na pasta uploads/ quando o processo é apagado.
        const docs = await executarQuery('SELECT * FROM documentos WHERE processo_id=?', [id]);

        docs.forEach(doc => {
            if (fs.existsSync(doc.caminho)) {
                try {
                    fs.unlinkSync(doc.caminho);
                } catch (erroFs) {
                    console.log("Erro ao apagar ficheiro do disco:", erroFs);
                }
            }
        });

        await executarQuery('DELETE FROM processos WHERE id=?', [id]);

        notificacao.criarNotificacao(
            'ALERTA',
            `Processo ${id} foi eliminado`
        );

        logs.registarLog(
            req.user.id,
            id,
            "ELIMINAR",
            `Eliminou o processo ID ${id}`
        );

        res.json({ mensagem: 'Processo eliminado' });

    } catch (err) {
        res.status(500).json({ erro: "Erro ao eliminar processo", detalhe: err.message });
    }
};

// =========================
// DOWNLOAD
// =========================
exports.downloadDocumento = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {

        const result = await executarQuery('SELECT * FROM documentos WHERE id=?', [id]);

        if (result.length === 0) {
            return res.status(404).json({ erro: "Documento não encontrado" });
        }

        const doc = result[0];

        if (!fs.existsSync(doc.caminho)) {
            return res.status(404).json({ erro: "Ficheiro não existe no servidor" });
        }

        logs.registarLog(
            req.user.id,
            doc.processo_id,
            "DOWNLOAD",
            `Fez download do documento ${doc.nome_original}`
        );

        // Antes: res.download(path.resolve(doc.caminho)) — sem o segundo
        // argumento, o download saía sempre com o nome interno gerado
        // pelo multer (ex.: "a1b2c3d4") em vez do nome original do
        // ficheiro. Agora usa o nome original.
        res.download(path.resolve(doc.caminho), doc.nome_original);

    } catch (err) {
        res.status(500).json({ erro: "Erro ao fazer download", detalhe: err.message });
    }
};

// =========================
// PREVIEW
// =========================
// NOTA DE SEGURANÇA: esta rota é usada dentro de um <iframe> no frontend,
// que não consegue enviar o cabeçalho "Authorization" — por isso continua
// sem 'verificarToken' na rota (ver documentoRoutes.js). Para não ficar
// totalmente aberta, o Content-Type devolvido vem sempre da base de
// dados (nunca do pedido), e confirma-se sempre que o ficheiro existe
// antes de o servir.
exports.previewDocumento = async (req, res) => {

    const id = req.params.id;

    if (!idValido(id)) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {

        const result = await executarQuery('SELECT * FROM documentos WHERE id=?', [id]);

        if (result.length === 0) {
            return res.status(404).json({ erro: "Documento não encontrado" });
        }

        const doc = result[0];

        if (!fs.existsSync(doc.caminho)) {
            return res.status(404).json({ erro: "Ficheiro não existe no servidor" });
        }

        res.setHeader("Content-Type", doc.tipo_arquivo);
        res.setHeader("Content-Disposition", "inline");

        res.sendFile(path.resolve(doc.caminho));

    } catch (err) {
        res.status(500).json({ erro: "Erro ao pré-visualizar documento", detalhe: err.message });
    }
};

// =========================
// LISTAR LOGS
// =========================
exports.listarLogs = async (req, res) => {
    try {
        const result = await executarQuery(`
            SELECT
                logs.*,
                usuarios.nome
            FROM logs
            LEFT JOIN usuarios
            ON usuarios.id = logs.usuario_id
            ORDER BY logs.data_acao DESC
        `);

        res.json(result);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao listar logs", detalhe: err.message });
    }
};