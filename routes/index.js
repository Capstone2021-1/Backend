const express = express();
const db = require('./mysql');

const router = express.Router();

router.get('/', (req, res) => {
	res.json('Hello, EVtalk');
});

router.get('/chargingStation', (req, res) => {
	var sql = `SELECT id, name, lng, lat FROM charging_station`;
	db.query(sql, (err, result) => {
		if(err) console.log('충전소 정보 전송 실패', err);
		else res.json(result);
	});
});

router.get('/info/membership_list', (req, res) => {
	var sql = 'SELECT * FROM membership';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

router.get('/info/payment_list', (req, res) => {
	var sql = 'SELECT * FROM payment';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

router.get('/info/car_list', (req, res) => {
	var sql = 'SELECT enterprise, vehicle_type, image FROM car';
	db.query(sql, (err, result) => {
		if(err) res.json(err);
		else res.json(result);
	});
});

var client_id = 'JLVMtPNtATW6dqr4sGCS';
var client_secret = 'ApyaiBWcdu';
router.get('/search/charging_station', function (req, res) {
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

module.exports = router;