const express = require("express");
const router = express.Router();

const { exec } = require("child_process");
const path = require("path");

// BACKUP
router.get("/backup", (req, res) => {

    const ficheiro =
        "backup_" + Date.now() + ".sql";

    const destino =
        path.join(__dirname, "../backup", ficheiro);

    const mysqldump =
    `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe"`;

const comando =
    `${mysqldump} -u root -proot gestao_documentos_anres > "${destino}"`;
    exec(comando, (erro) => {

        if (erro) {
            return res.status(500).json({
                mensagem: "Erro ao criar backup",
                erro
            });
        }

        res.download(destino);

    });

});

module.exports = router;