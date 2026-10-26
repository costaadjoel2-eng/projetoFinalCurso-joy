const db = require('../db');

/* Listar notificacao */
exports.listarNotificacao = (req,res)=>{

    db.query(`
        SELECT *
        FROM notificacao
        ORDER BY data_criacao DESC
    `,
    (err,result)=>{

        if(err)
            return res.status(500).json(err);

        res.json(result);
    });

};

/* Criar notificação */
exports.criarNotificacao = (
    tipo,
    mensagem
)=>{

    db.query(`
        INSERT INTO notificacao
        (
            tipo,
            mensagem
        )
        VALUES (?,?)
    `,
    [
        tipo,
        mensagem
    ],
    (err)=>{

        if(err)
            console.log(err);

    });

};