const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'gestao_documentos_anres'
});

connection.connect((err) => {

  if (err) {
    console.error('ERRO MYSQL:');
    console.error(err);
  } else {
    console.log('MySQL conectado com sucesso');
  }

});

module.exports = connection;