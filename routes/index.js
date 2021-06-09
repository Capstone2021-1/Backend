const express = require('express');
const db = require('../mysql');
const router = express.Router();

router.get('/', (req, res) => {
	res.json('Hello, EVtalk');
});

router.get('/chargingStation', (req, res) => {
	var sql = 'SELECT charging_station.id, business.name as busiNm, charging_station.name, lng, lat, chgerType, limitDetail, note FROM charging_station, stat_list, business WHERE statId = charging_station.id && busiId = business.id;';
	db.query(sql, (err, result) => {
		if(err) console.log('충전소 정보 전송 실패', err);
		else res.json(result);
	});
});

router.get('/membership', (req, res) => {
	var sql = 'SELECT * FROM membership';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

router.get('/payment', (req, res) => {
	var sql = 'SELECT * FROM payment';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

router.get('/car', (req, res) => {
	var sql = 'SELECT enterprise, vehicle_type, image FROM car';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

var client_id = 'JLVMtPNtATW6dqr4sGCS';
var client_secret = 'ApyaiBWcdu';
router.get('/search/charging-station', function (req, res) {
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
				search.iOt = (temp[i].title).replace(/(<([^>]+)>)/ig,""); search.nOa = temp[i].address;
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

router.get('/search/review', (req, res) => {
	var sql = 'SELECT user_id, name, stat_id, review, date FROM review,user WHERE user_id = user.id AND stat_id = ?;';
	db.query(sql, [req.query.stat_id], (err, result) => {
		if(err) res.json(err);
		else {
			res.json(result);
		}
	})
});

var destination = require('./date');

router.get('/search/destination', (req, res) => {
	var station = req.query.stat_id;
	var result = new Array();
	for(var i = 0; i < destination.length; i++)
		if(destination[i].stat_id == station)
			result.push(destination[i]);

	var size = result.length;
	var min = 1000000;
	var now = new Date();
	for(var i = 0; i < result.length; i++) {
		var rDate = new Date(result[i].date);
		var dist = result[i].distance - (now - rDate)*(241 / 36000)/1000;
		if(min > dist && dist > 0)
			min = dist;
		if(dist <= 0)
			size--;
	}
	if(min == 1000000)
		res.json("같은 충전소로 향하는 사용자가 없습니다.");
	else {
		var str = '약 ' + min.toFixed(2) + 'km 떨어진 거리에서 같은 목적지로 향하는 사용자가 있습니다.';
		if(size > 1)
			str += ' (외 ' + (size -1) + '명)';
		res.json(str);
	}
});

const schedule = require('node-schedule');

router.post('/destination', (req, res) => {
	var stat_id = req.query.stat_id;
	var user_id = req.query.user_id;
	var distance = req.query.distance;
	var temp = new Date(req.query.date);
	var date = new Date(temp + 9*60*60*1000);
	var item = {stat_id : `${stat_id}`, user_id : `${user_id}`, distance : `${distance}`, date : `${date}`};
	destination.push(item);
	date.setSeconds(date.getSeconds() + distance*(36000 / 241));

	var job = schedule.scheduleJob(date, function() {
		destination.pop(item);
	})
	res.send('목적지 설정 추가');
});

router.get('/search/person', (req, res) => {
	var car_number = req.query.car_number;
	var sql = 'SELECT id, car_number, message, profile_image FROM user WHERE car_number = ?;';
	db.query(sql, car_number, (err, result) => {
		if(err) {
			console.log(err);
			res.json(err);
		}
		else {
			if(result.length == 1) {
				console.log(result[0]);
				res.json(result[0]);
			} else res.json({id: -1, car_number: car_number, message: "", profile_image: ""});
		}
	});

});

router.get('/dett', (req, res) => {
	var target_token = 'e8C_zZKeTL66fvDHU-1DVH:APA91bHjr2VC-uJOSZQMRSTWZxo-NapzyPoY6mznj-zKo6WIjTvfZcmJ-Rq0ww2ljcbzOcbr3Vk9nTwf2LTIrr_Jp_G3vrreRl5ZX-_WClAlo9NDOTCOJx-GDSHiTbrkrrzQ369nCyYL';

	var message = {
		notification: {
			title: '테스트 데이터 발송',
			body: '데이터 잘 가나요?',
		},
		token: target_token,
	}

	admin
	.messaging()
	.send(message)
	.then(function (response) {
		console.log('Successfully sent message: : ', response)
		return res.status(200).json({success : true})
	})
	.catch(function (err) {
		console.log('Error Sending message!!! : ', err)
		return res.status(400).json({success : false})
	});
})


module.exports = router;
