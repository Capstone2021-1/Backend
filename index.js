var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var db = require('./mysql');
var app = express();

const privateKey = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/privkey.pem', 'utf-8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/cert.pem', 'utf-8');
const ca = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/fullchain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
	console.log('서버 접속 완료');
	for(var i = 0; i < 10; i++) {
		res.json(i + ' ');
	}
	res.json('성공');
});

app.post('/login', (req, res) => {
	var id = req.body.id;
	var name = req.body.name;
	var image = req.body.profile_image;
	console.log(`${name} 님이 로그인 하셨습니다.`);
	var sql = `SELECT * FROM user WHERE id = ${id}`;

	db.query(sql, (err, result) => {
		if(err)	console.log(err);
		else {
			if(result.length === 0) {
				var joinSql = 'INSERT INTO user(id, name, profile_image, car_number, message) VALUES (?, ?, ?, "", "")';
				var params = [id, name, image];
				db.query(joinSql, params, (err2, result2) => {
					if(err2) console.log(err2);
					else res.send(`${name} 님이 회원가입 하셨습니다.`);
				});
			}
			else {
				var updateSql = 'UPDATE user SET name = ?, profile_image = ? WHERE id = ?';
				var params = [name, image, id];
				db.query(updateSql, params, (err2, result2) => {
					if(err2) console.log(err2);	
					else res.send(`${name} 님이 로그인 하셨습니다.`);
				});
			}
		}
	});
});

app.get('/userInfo', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT car_number, message FROM user WHERE id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log(err);
		res.json({
			'car_number' : result[0].car_number,
			'message' : result[0].message
		});
	});
});

app.put(`/userInfo/update/:id`, (req, res) => {
	var sql = 'UPDATE user SET message=?, car_number=? WHERE id=?';
	var params = [req.body.message, req.body.car_number, req.params.id];
	db.query(sql, params, (err, result) => {
		if(err) console.log('회원정보 수정 실패', err);
		else res.send(`${req.params.id} 회원정보  수정 완료`);
	});
});

app.put(`/userInfo/update/membership/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM membership_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO membership_list(user_id, membership_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

app.put(`/userInfo/update/payment/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM payment_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO payment_list(user_id, payment_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

app.put(`/userInfo/update/car/:id`, (req, res) => {
	var sql = 'UPDATE user SET car_id = (SELECT id FROM car WHERE vehicle_type = ?) WHERE id = ?';
	var params = [req.body.vehicle_type, req.params.id];
	db.query(sql, params, (err, result) => {
		if(err) res.send(err);
		else {
			var sql2 = `SELECT * FROM car WHERE id=(SELECT car_id FROM user WHERE id=${req.params.id})`;
			db.query(sql2, (err2, result2) => { res.json(result2[0]); });
		}
	});
});

app.delete(`/delete/:id`, (req, res) => {
	console.log(`${req.params.id} 회원을 삭제합니다`);
	var sql = `DELETE FROM user WHERE id = ${req.params.id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 삭제 실패', err);
		else res.send(`${req.params.id} 회원 삭제 완료`);
	});
});

app.get('/chargingStation', (req, res) => {
	console.log('충전소 정보 전송...');
	var sql = `SELECT * FROM charging_station`;
	db.query(sql, (err, result) => {
		if(err) console.log('정보 전송 실패', err);
		else res.json(result);
	});
});

app.get(`/userInfo/car`, (req, res) => {
	console.log('차량 정보 전송...');
	var id = req.query.id;
	var sql = `SELECT * FROM car WHERE id = (SELECT car_id FROM user WHERE id=${id})`;
	db.query(sql, (err, result) => {
		if(err) res.json('차량 정보 전송 실패');
		else res.json(result[0]);
	});
});

app.get('/userInfo/membership', (req, res) => {
	console.log('멤버십 카드 정보 전송...');
	var id = req.query.id;
	var sql = `SELECT membership.id as id, card_name, image FROM membership_list INNER JOIN membership on membership_id=membership.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 카드 정보 전송 실패');
		else res.json(result);
	});
});

app.get('/userInfo/payment', (req, res) => {
	console.log('결제 카드 정보 전송...');
	var id = req.query.id;
	var sql = `SELECT payment_id as id, card_name, image FROM payment_list INNER JOIN payment on payment_id=payment.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('결제 카드 정보 전송 실패');
		else res.json(result);
	});
});

app.get('/info/membership_list', (req, res) => {
	var sql = 'SELECT * FROM membership';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

app.get('/info/payment_list', (req, res) => {
	var sql = 'SELECT * FROM payment';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

app.get('/info/car_list', (req, res) => {
	var sql = 'SELECT enterprise, vehicle_type, image FROM car';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

app.get('/getChargingFee', (req, res) => {
	var non_member = 'SELECT busiId, non_member FROM membership_fee';
	db.query(non_member, (err1, result1) => {
		if(err1) res.json(err1);
		else {
			var membership = 'SELECT membership_id FROM membership_list WHERE  user_id = ?';
			db.query(membership, (err2, result2) => {
				for(var i = 0; i < result2.length; i++) {
					res.json(i);
				}
			})
		}
	})
})

http.createServer(app).listen(80, () => {
	console.log('http server running on port 80');
});
https.createServer(credentials, app).listen(443, () => {
	console.log('https server running on port 443');
});