const db = require('../db');

exports.registarLog = (
    usuario_id,
    processo_id,
    acao,
    descricao
) => {

    db.query(
        `
        INSERT INTO logs(
            usuario_id,
            processo_id,
            acao,
            descricao
        )
        VALUES(?,?,?,?)
        `,
        [
            usuario_id,
            processo_id,
            acao,
            descricao
        ],
        (err) => {

            if(err){
                console.log("Erro ao gravar log:", err);
            }

        }
    );
};