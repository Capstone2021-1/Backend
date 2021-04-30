var mysql = require('mysql');

var db = mysql.createConnection({
	host: 'evtalk.cfgygnwgvupa.ap-northeast-2.rds.amazonaws.com',
	user: 'admin',
	database: 'evtalk',
	password: 'qwer1234',
	port: 3306,
	multipleStatements: true
});
db.connect();

module.exports = db;
