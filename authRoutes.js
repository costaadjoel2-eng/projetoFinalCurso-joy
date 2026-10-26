const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SEGREDO = 'SEGREDO_SUPER_SECRET';


// =========================
// REGISTO DE UTILIZADOR
// =========================
router.post('/register', async (req, res) => {

    const { nome, email, senha, tipo } = req.body;

    try {

        // verificar se existe
        db.query('SELECT * FROM usuarios WHERE email=?', [email], async (err, result) => {

            if (result.length > 0) {
                return res.status(400).json({ mensagem: 'Email já existe' });
            }

            const hash = await bcrypt.hash(senha, 10);

            db.query(
                'INSERT INTO usuarios(nome,email,senha,tipo) VALUES(?,?,?,?)',
                [nome, email, hash, tipo || 'usuario'],
                (err2) => {

                    if (err2) return res.status(500).json(err2);

                    res.json({ mensagem: 'Utilizador criado com sucesso' });
                }
            );

        });

    } catch (error) {
        res.status(500).json({ mensagem: 'Erro no registo' });
    }
});


// =========================
// LOGIN
// =========================
router.post('/login', (req, res) => {

    const { email, senha } = req.body;

    db.query(
        'SELECT * FROM usuarios WHERE email=?',
        [email],
        async (err, result) => {

            if (err) return res.status(500).json(err);

            if (result.length === 0) {
                return res.status(401).json({ mensagem: 'Utilizador não encontrado' });
            }

            const user = result[0];

            const senhaOk = await bcrypt.compare(senha, user.senha);

            if (!senhaOk) {
                return res.status(401).json({ mensagem: 'Senha inválida' });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    nome: user.nome,
                    tipo: user.tipo
                },
                SEGREDO,
                { expiresIn: '8h' }
            );

            res.json({
                token,
                utilizador: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    tipo: user.tipo
                }
            });
        }
    );
});
router.put('/alterar-senha', async (req, res) => {

    const { email, senhaAtual, novaSenha } = req.body;

    try {

        db.query(
            'SELECT * FROM usuarios WHERE email=?',
            [email],
            async (err, result) => {

                if (err)
                    return res.status(500).json(err);

                if (result.length === 0) {

                    return res.status(404).json({
                        mensagem: 'Utilizador não encontrado'
                    });

                }

                const user = result[0];

                const senhaValida =
                    await bcrypt.compare(
                        senhaAtual,
                        user.senha
                    );

                if (!senhaValida) {

                    return res.status(400).json({
                        mensagem: 'Senha atual incorreta'
                    });

                }

                const novaHash =
                    await bcrypt.hash(
                        novaSenha,
                        10
                    );

                db.query(
                    'UPDATE usuarios SET senha=? WHERE id=?',
                    [novaHash, user.id],
                    (erroUpdate) => {

                        if (erroUpdate)
                            return res.status(500).json(erroUpdate);

                        res.json({
                            mensagem: 'Senha alterada com sucesso'
                        });

                    }
                );

            }
        );

    } catch (erro) {

        res.status(500).json({
            mensagem: 'Erro interno'
        });

    }

});
// =========================
// ATUALIZAR PERFIL
// =========================
router.put('/perfil', (req, res) => {

    const { emailAtual, nome, email } = req.body;

    db.query(
        `UPDATE usuarios
         SET nome = ?, email = ?
         WHERE email = ?`,
        [nome, email, emailAtual],
        (err, result) => {

            if(err){
                return res.status(500).json(err);
            }

            if(result.affectedRows === 0){
                return res.status(404).json({
                    mensagem:"Utilizador não encontrado"
                });
            }

            res.json({
                mensagem:"Perfil atualizado com sucesso."
            });

        }
    );

});

module.exports = router;