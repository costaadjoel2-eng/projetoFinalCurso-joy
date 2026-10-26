const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registar = (req,res)=>{

    const {nome,email,senha,role} = req.body;

    const hash = bcrypt.hashSync(senha,10);

    db.query(
        'INSERT INTO usuarios (nome,email,senha,role) VALUES (?,?,?,?)',
        [nome,email,hash,role],
        (err)=>{
            if(err) return res.status(500).json(err);
            res.json({msg:'Utilizador criado'});
        }
    );
};

exports.login = (req,res)=>{

    const {email,senha} = req.body;

    db.query(
        'SELECT * FROM usuarios WHERE email=?',
        [email],
        (err,users)=>{

            if(users.length===0){
                return res.status(401).json({mensagem:'Utilizador não encontrado'});
            }

            const user = users[0];

            const valid = bcrypt.compareSync(senha,user.senha);

            if(!valid){
                return res.status(401).json({mensagem:'Senha inválida'});
            }

            const token = jwt.sign(
                {
                    id:user.id,
                    role:user.role
                },
                'SECRET123',
                {expiresIn:'1d'}
            );

            res.json({
                token,
                utilizador:{
                    id:user.id,
                    nome:user.nome,
                    role:user.role
                }
            });
        }
    );
};