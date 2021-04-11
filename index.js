var express = require('express');
var bodyParser = require('body-parser');
var db = require('./mysql');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.listen(80, () => {
  console.log('--start index.js--');
});

app.get('/', (req, res) => {
	console.log('서버 접속 완료');
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
	var sql = `SELECT membership.id, card_name, image FROM membership_list INNER JOIN membership on membership_id=membership.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) res.json('회원 카드 정보 전송 실패');
		else res.json(result);
	});
});

app.get('/userInfo/payment', (req, res) => {
	console.log('결제 카드 정보 전송...');
	var id = req.query.id;
	var sql = `SELECT payment_id, card_name, image FROM payment_list INNER JOIN payment on payment_id=payment.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) res.json('결제 카드 정보 전송 실패');
		else res.json(result);
	});
});

