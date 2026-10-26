const express = require("express");
const router = express.Router();

const ExcelJS = require("exceljs");
const db = require("../db");

// ===========================================
// EXPORTAR EXCEL
// ===========================================

router.get("/excel", (req, res) => {

    const sql = `
        SELECT
            id,
            processo_id,
            nome_original,
            nome_arquivo,
            tipo_arquivo,
            tamanho,
            data_upload
        FROM documentos
    `;

    db.query(sql, async (erro, dados) => {

        if (erro) {

            console.log(erro);

            return res.status(500).json({
                mensagem: "Erro ao gerar Excel."
            });

        }

        const workbook = new ExcelJS.Workbook();

        const worksheet =
            workbook.addWorksheet("Documentos");

        worksheet.columns = [

            {
                header: "ID",
                key: "id",
                width: 10
            },

            {
                header: "Processo",
                key: "processo_id",
                width: 15
            },

            {
                header: "Nome Original",
                key: "nome_original",
                width: 35
            },

            {
                header: "Nome do Arquivo",
                key: "nome_arquivo",
                width: 35
            },

            {
                header: "Tipo",
                key: "tipo_arquivo",
                width: 20
            },

            {
                header: "Tamanho",
                key: "tamanho",
                width: 15
            },

            {
                header: "Data Upload",
                key: "data_upload",
                width: 25
            }

        ];

        dados.forEach(documento => {

            worksheet.addRow(documento);

        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Relatorio_Documentos.xlsx"
        );

        await workbook.xlsx.write(res);

        res.end();

    });

});

module.exports = router;