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
	res.json('Hello, EVtalk');
});

app.post('/login', (req, res) => {
	var id = req.body.id;
	var name = req.body.name;
	var image = req.body.profile_image;
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
	var sql = `SELECT id, name, lng, lat FROM charging_station`;
	db.query(sql, (err, result) => {
		if(err) console.log('충전소 정보 전송 실패', err);
		else res.json(result);
	});
});

app.get(`/userInfo/car`, (req, res) => {
	var id = req.query.id;
	var sql = `SELECT * FROM car WHERE id = (SELECT car_id FROM user WHERE id=${id})`;
	db.query(sql, (err, result) => {
		if(err) res.json('차량 정보 전송 실패');
		else res.json(result[0]);
	});
});

app.get('/userInfo/membership', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT membership.id as id, card_name, image FROM membership_list INNER JOIN membership on membership_id=membership.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 카드 정보 전송 실패');
		else res.json(result);
	});
});

app.get('/userInfo/payment', (req, res) => {
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
	var non_member = 'SELECT busiId, non_member as fee FROM membership_fee';
	db.query(non_member, (err1, result1) => {
		if(err1) res.json(err1);
		else {
			var member = `SELECT busiId, member FROM membership_fee WHERE busiId IN (SELECT membership_id as membership FROM membership_list WHERE user_id=${req.query.id});`;

			var roaming = `SELECT MIN(CV) AS CV, MIN(EV) AS EV, MIN(GN) AS GN, MIN(HE) AS HE, MIN(JE) AS JE, MIN(KP) AS KP, MIN(KT) AS KT, MIN(ME) AS ME, MIN(PI) AS PI, MIN(PW) AS PW, MIN(SF) AS SF, MIN(ST) AS ST, MIN(KL) AS KL FROM roaming_fee WHERE membership IN (SELECT membership_id FROM membership_list WHERE user_id=${req.query.id});`;
			db.query(member + roaming, (err2, results) => {
				if(err2) res.json(err2);
				else {
					for(j in result1) {
						for(i in results[0]) {
							if(result1[j].busiId == results[0][i].busiId)
								result1[j].fee = results[0][i].member;
						}

						for(i in results[1][0]) {
							if(result1[j].busiId == i) {
								if(results[1][0][i] == null);
								else if(result1[j].fee == null || result1[j].fee > results[1][0][i])
									result1[j].fee = results[1][0][i];
							}
						}
					}
					res.json(result1);
				}
			})
		}
	})
});

var client_id = 'JLVMtPNtATW6dqr4sGCS';
var client_secret = 'ApyaiBWcdu';
app.get('/search/charging_station', function (req, res) {
	var sql = `SELECT id, name, lng, lat FROM charging_station WHERE name LIKE '%${req.query.query}%' OR address LIKE '%${req.query.query}%';`;
	var totalResult = new Array();
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		for(var i = 0; i < result.length; i++){
			var search = new Object();
			search.iOt = result[i].id; search.nOa = result[i].name;
			search.lngOx = result[i].lng; search.latOy = result[i].lat; search.isChSt = 1;
			totalResult.push(search);
		}
	});

	var api_url = 'https://openapi.naver.com/v1/search/local?query=' + encodeURI(req.query.query) + '&display=5';
	var request = require('request');
	var options = {
       		url: api_url,
       		headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    	};
   	request.get(options, function (error, response, body) {
     	if (!error && response.statusCode == 200) {
		var temp = JSON.parse(body).items;
		for(var i = 0; i < temp.length; i++) {
			var search = new Object();
			search.iOt = temp[i].title; search.nOa = temp[i].address;
			search.lngOx = temp[i].mapx; search.latOy = temp[i].mapy; search.isChSt = 0;
			totalResult.push(search);
		}
		res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
		res.end(JSON.stringify(totalResult));
     	} else {
       		res.status(response.statusCode).end();
       		console.log('error = ' + response.statusCode);
	}
	});
});

http.createServer(app).listen(80, () => {
	console.log('http server running on port 80');
});
https.createServer(credentials, app).listen(443, () => {
	console.log('https server running on port 443');
});
