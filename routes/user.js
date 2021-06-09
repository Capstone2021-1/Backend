const express = require('express');
const db = require('../mysql');

const router = express.Router();

function userFee(id) {
	var non_member = 'SELECT busiId, non_member as fee FROM membership_fee';
	db.query(non_member, (err1, result1) => {
		if(err1) return err1;
		else {
			var member = `SELECT busiId, member FROM membership_fee WHERE busiId IN (SELECT membership_id as membership FROM membership_list WHERE user_id=${id});`;

			var roaming = `SELECT MIN(CV) AS CV, MIN(EV) AS EV, MIN(GN) AS GN, MIN(HE) AS HE, MIN(JE) AS JE, MIN(KP) AS KP, MIN(KT) AS KT, MIN(ME) AS ME, MIN(PI) AS PI, MIN(PW) AS PW, MIN(SF) AS SF, MIN(ST) AS ST, MIN(KL) AS KL FROM roaming_fee WHERE membership IN (SELECT membership_id FROM membership_list WHERE user_id=${id});`;
			db.query(member + roaming, (err2, results) => {
				if(err2) return err2;
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
					return result1;
				}
			})
		}
	})
}

router.post('/', (req, res) => {
	var id = req.body.id;
	var name = req.body.name;
	var image = req.body.profile_image;
	console.log(name + '님 로그인');
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

router.get('/', (req, res) => {
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

router.post('/saveToken', (req, res) => {
	var id = req.query.id;
	var token = req.query.token;

	db.query('UPDATE user SET token = ? WHERE id = ?', [token, id], (err, result) => {
		if(err) console.log(err);
		else res.status(200).json({success : true})
	})
});

router.get('/car', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT * FROM car WHERE id = (SELECT car_id FROM user WHERE id=${id})`;
	db.query(sql, (err, result) => {
		if(err) res.json('차량 정보 전송 실패');
		else res.json(result[0]);
	});
});

router.get('/membership', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT membership.id as id, card_name, image FROM membership_list INNER JOIN membership on membership_id=membership.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 카드 정보 전송 실패');
		else res.json(result);
	});
});

router.get('/payment', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT payment_id as id, card_name, image FROM payment_list INNER JOIN payment on payment_id=payment.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('결제 카드 정보 전송 실패');
		else res.json(result);
	});
});

router.get('/fee', (req, res) => {
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

router.get('/estimated-charges', (req, res) => {
var d1 = new Date(new Date(req.query.date1) + 9*60*60*1000);	//충전 시작 시간
var d2 = new Date(new Date(req.query.date2) + 9*60*60*1000);	//충전 종료 시간
var charging_hour = (d2 - d1)/1000/60/60;	//충전 시간
var kwh = req.query.kwh;

var tot_chg = 0;	//총 충전량
var percent = 0;	//충전 퍼센트
var energy = `SELECT energy_capacity FROM user, car WHERE car_id = car.id AND user.id=${req.query.id};`;
db.query(energy, (err, result) => {
	if(err) console.log(err);
	else {
		if(result[0].energy_capacity > kwh*charging_hour) {	//에너지 용량이 충전량보다 많을 경우
			tot_chg = kwh*charging_hour;
			percent = (tot_chg/result[0].energy_capacity) * 100;
		}
		else {							//에너지 용량보다 충전량이 많거나 같을 경우
			tot_chg = result[0].energy_capacity;
			percent = 100;
			charging_hour = tot_chg / kwh;
		}
	}
	var non_member = 'SELECT busiId, non_member as fee FROM membership_fee';
	db.query(non_member, (err1, result1) => {
		if(err1) console.log(err1);
		else {
			var member = `SELECT busiId, member FROM membership_fee WHERE busiId IN (SELECT membership_id FROM membership_list WHERE user_id=${req.query.id} AND membership_id NOT IN ('EP', 'EV', 'GN', 'KL', 'KP', 'MO', 'PW'));`;

			var roaming = `SELECT MIN(CV) AS CV, MIN(EV) AS EV, MIN(GN) AS GN, MIN(HE) AS HE, MIN(JE) AS JE, MIN(KP) AS KP, MIN(KT) AS KT, MIN(ME) AS ME, MIN(PI) AS PI, MIN(PW) AS PW, MIN(SF) AS SF, MIN(ST) AS ST, MIN(KL) AS KL FROM roaming_fee WHERE membership IN (SELECT membership_id FROM membership_list WHERE user_id=${req.query.id});`;

			var load = `SELECT busiId, light_load, middle_load, maximum_load FROM membership_fee WHERE busiId IN (SELECT id FROM membership_list INNER JOIN membership on membership_id = id WHERE user_id =${req.query.id} AND id IN ('EP', 'EV', 'GN', 'KL', 'KP', 'MO', 'PW'));`;
			db.query(member + roaming + load, (err2, results) => {
				if(err2) console.log(err2);
				else {
					for(j in result1) {
						for(i in results[0])
							if(result1[j].busiId == results[0][i].busiId)
								result1[j].fee = results[0][i].member;
						for(i in results[1][0])
							if(result1[j].busiId == i) {
								if(results[1][0][i] == null);
								else if(result1[j].fee == null || result1[j].fee > results[1][0][i])
									result1[j].fee = results[1][0][i];
							}
					}
					for(j in result1)
						result1[j].fee *= tot_chg;
					if(results[2].length > 0) {
						var lgt_t = 0; var mid_t = 0; var max_t = 0;
						while(lgt_t + mid_t + max_t < charging_hour * 60) {
							var d1_h = d1.getHours();
							if(23 <= d1_h || d1_h < 9)
								lgt_t++;
							else if((10 <= d1_h && d1_h < 12)||(13 <= d1_h && d1_h < 17))
								max_t++;
							else
								mid_t++;
							d1.setMinutes(d1.getMinutes() + 1);
						}
						for(i in result1)
							for(j in results[2]) 
								if(result1[i].busiId == results[2][j].busiId)
									result1[i].fee = kwh * results[2][j].light_load * lgt_t/60 + kwh * results[2][j].middle_load * mid_t/60 + kwh *results[2][j].maximum_load * max_t/60;

					}
					result1.push({busiId : "charging", fee : tot_chg});
					result1.push({busiId : "percent", fee : percent});
					result1.push({busiId : "charging_hour", fee : charging_hour});
					res.json(result1);
				}
			})
		}
	})
	
});
});

router.post('/review', (req, res) => {
	var sql = 'INSERT INTO review(user_id, stat_id, review) VALUES (?, ?, ?);'
	var params = [req.body.user_id, req.body.stat_id, req.body.review];
	db.query(sql, params, (err, result) => {
		if(err) console.log(err);
		else {
			console.log(req.body.user_id + '님 리뷰 추가');
			res.json("리뷰 추가 완료");
		}
	});

});

router.get('/getReview', (req, res) => {
	var sql = 'SELECT count(*) as total FROM review WHERE user_id = ?;'
	db.query(sql, req.query.id, (err, result) => {
		if(err) console.log(err)
		else res.json(result[0]);
	})
});

router.delete('/deleteReview', (req, res) => {
	var sql = 'DELETE FROM review WHERE user_id = ? and stat_id = ? and review = ?;'
	var params = [req.query.id, req.query.stat_id, req.query.review]
	db.query(sql, params, (err, result) => {
		if(err) console.log(err)
	})

});

router.put(`/:id`, (req, res) => {
	var sql = 'UPDATE user SET message=?, car_number=? WHERE id=?';
	var params = [req.body.message, req.body.car_number, req.params.id];
	db.query(sql, params, (err, result) => {
		if(err) console.log('회원정보 수정 실패', err);
		else res.send(`${req.params.id} 회원정보  수정 완료`);
	});
});

router.put(`/membership/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM membership_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO membership_list(user_id, membership_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

router.put(`/payment/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM payment_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO payment_list(user_id, payment_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

router.put(`/car/:id`, (req, res) => {
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

router.delete(`/:id`, (req, res) => {
	console.log(`${req.params.id} 회원을 삭제합니다`);
	var sql = `DELETE FROM user WHERE id = ${req.params.id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 삭제 실패', err);
		else res.send(`${req.params.id} 회원 삭제 완료`);
	});
});


module.exports = router
