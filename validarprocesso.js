// =========================
// VALIDAÇÃO DE PROCESSO
// =========================
// Centraliza as regras de negócio usadas tanto na criação como na
// edição de processos, para as duas rotas nunca ficarem com lógica
// diferente por engano.
//
// Colocar este ficheiro em: utils/validarProcesso.js

const TIPOS_DOCUMENTO = [
    'Processo Completo',
    'Documento de Entrada',
    'Certidao Assinada pelo Requerente',
    'Relatorio de Reconhecimento',
    'Certidao Original'
];

const GENEROS = ['Masculino', 'Feminino'];

const GRAUS_ACADEMICOS = [
    'Licenciatura',
    'Mestrado',
    'Doutoramento',
    'Pos-Graduacao',
    'Especailidade-Medica' // mantido igual ao frontend — tem um erro ortográfico
                            // ("Especialidade"), mas os dois lados têm de bater certo
];

const ESTADOS = ['Deferido', 'Indeferido', 'Em Trâmite'];

const CONTINENTES = ['Africa', 'Europa', 'America', 'Asia', 'Oceania'];

function dataValida(valor) {
    if (!valor) return false;
    const data = new Date(valor);
    return !isNaN(data.getTime());
}

/**
 * Valida um objeto de processo já normalizado (ver normalizarDados no
 * controller). Devolve um array de mensagens de erro — vazio se estiver
 * tudo certo.
 */
function validarProcesso(d) {

    const erros = [];

    // ---------- Campos de texto obrigatórios ----------
    const camposObrigatorios = {
        nome_requerente: 'Nome do requerente',
        numero_deliberacao: 'Número da deliberação',
        numero_processo: 'Número do processo',
        pais_emissor: 'País emissor',
        instituicao: 'Instituição emissora',
        designacao: 'Designação do curso',
        bi: 'Número do BI'
    };

    for (const campo in camposObrigatorios) {
        if (!d[campo] || String(d[campo]).trim() === '') {
            erros.push(`${camposObrigatorios[campo]} é obrigatório.`);
        }
    }

    // ---------- Enums ----------
    if (!d.tipo_documento || !TIPOS_DOCUMENTO.includes(d.tipo_documento)) {
        erros.push('Tipo de documento inválido ou não indicado.');
    }

    if (!d.genero || !GENEROS.includes(d.genero)) {
        erros.push('Género inválido ou não indicado.');
    }

    if (!d.grau_academico || !GRAUS_ACADEMICOS.includes(d.grau_academico)) {
        erros.push('Grau académico inválido ou não indicado.');
    }

    if (d.estado && !ESTADOS.includes(d.estado)) {
        erros.push('Estado do processo inválido.');
    }

    if (d.continente && !CONTINENTES.includes(d.continente)) {
        erros.push('Continente inválido.');
    }

    // ---------- Datas ----------
    if (!dataValida(d.data_entrada)) {
        erros.push('Data de entrada é obrigatória e deve ser uma data válida.');
    }

    if (!dataValida(d.data_inicio_curso)) {
        erros.push('Data de início do curso é obrigatória e deve ser uma data válida.');
    }

    if (!dataValida(d.data_conclusao_curso)) {
        erros.push('Data de conclusão do curso é obrigatória e deve ser uma data válida.');
    }

    // Lógica entre datas — só faz sentido comparar se todas forem válidas
    if (dataValida(d.data_inicio_curso) && dataValida(d.data_conclusao_curso)) {
        if (new Date(d.data_inicio_curso) > new Date(d.data_conclusao_curso)) {
            erros.push('A data de início do curso não pode ser posterior à data de conclusão.');
        }
    }

    if (dataValida(d.data_conclusao_curso) && dataValida(d.data_entrada)) {
        if (new Date(d.data_conclusao_curso) > new Date(d.data_entrada)) {
            erros.push('A data de conclusão do curso não pode ser posterior à data de entrada do processo.');
        }
    }

    if (dataValida(d.data_entrada)) {
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        if (new Date(d.data_entrada) > hoje) {
            erros.push('A data de entrada não pode ser uma data futura.');
        }
    }

    // ---------- BI ----------
    // O formato exato do BI de São Tomé e Príncipe não foi fornecido, por
    // isso só validamos um tamanho razoável. Se tiver o formato oficial
    // (ex.: sempre 8 dígitos), troque esta verificação por um regex fixo,
    // por exemplo: /^[0-9]{8}$/.test(d.bi)
    if (d.bi && (String(d.bi).trim().length < 4 || String(d.bi).trim().length > 20)) {
        erros.push('Número do BI parece inválido (tamanho fora do esperado).');
    }

    return erros;
}

module.exports = {
    validarProcesso,
    TIPOS_DOCUMENTO,
    GENEROS,
    GRAUS_ACADEMICOS,
    ESTADOS,
    CONTINENTES
};