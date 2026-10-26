const express = require("express");
const router = express.Router();

const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// ===================================
// Upload do ficheiro
// ===================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            path.join(__dirname, "../uploads_backup")
        );

    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + "_" + file.originalname
        );

    }

});

const upload = multer({ storage });

// ===================================
// Restaurar Backup
// ===================================

router.post(
    "/restore",
    upload.single("backup"),
    (req, res) => {

        if (!req.file) {

            return res.status(400).json({
                mensagem: "Nenhum ficheiro enviado."
            });

        }

        const ficheiro = req.file.path;

        console.log("Backup:", ficheiro);

        const comando =
`cmd.exe /c ""C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -proot gestao_documentos_anres < "${ficheiro}""`;

        console.log(comando);

        exec(comando, (erro, stdout, stderr) => {

    console.log("========== RESULTADO ==========");
    console.log("stdout:");
    console.log(stdout);

    console.log("stderr:");
    console.log(stderr);

    console.log("erro:");
    console.log(erro);

    fs.unlink(ficheiro, () => {});

    if (erro) {

        return res.status(500).json({

            mensagem: "Erro ao restaurar backup.",

            erro: erro.message

        });

    }

    res.json({

        mensagem: "Backup restaurado com sucesso!"

    });

});
    }

);

module.exports = router;