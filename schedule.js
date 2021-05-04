const schedule = require('node-schedule');
var convert = require('xml-js');
var request = require('request');
var db = require('./mysql');

var url = 'http://apis.data.go.kr/B552584/EvCharger/getChargerInfo';
var queryParams = '?' + encodeURIComponent('ServiceKey') + '=%2BKctK6sCnrlkUxKAGbtxsw4ZEV4x4oeLyViNSH%2FjfjNumzKpfre5WkPNLKKltku5I%2FP54TR6iUTsvYeFybHo2A%3D%3D'; /* Service Key*/
queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /*페이지 번호*/
queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('9999'); /*최대 반환 개수*/
queryParams += '&' + encodeURIComponent('zcode') + '=' + encodeURIComponent('11'); /*지역코드 11 : 서울특별시*/


const job = schedule.scheduleJob('0 0 3 * * MON', function () {
	request({
		url: url + queryParams,
		method: 'GET'
	}, function (error, response, body) {
		var xmlToJson = convert.xml2js(body, { compact: true, spaces: 4 });
		var result = xmlToJson.response.body.items.item;
		var count = result.length;
		var sqlDelete = 'DELETE FROM charging_station';
		db.query(sqlDelete, (err1, result1) => {
			var sqlInsert1 = `INSERT INTO charging_station(id, name, address, lat, lng) VALUES (?, ?, ?, ?, ?);`;
			var sqlInsert2 = `INSERT INTO stat_list(statId, busiId) VALUES (?, ?);`;
			var sqlInsert3 = `INSERT INTO business(id, name, busiCall) VALUES (?, ?, ?)`;
			for (var i = 0; i < count; i++) {
				var params1 = [result[i].statId._text, result[i].statNm._text, result[i].addr._text, result[i].lat._text, result[i].lng._text];
				var sqlInsert1s = db.format(sqlInsert1, params1);
				var params2 = [result[i].statId._text, result[i].busiId._text];
				var sqlInsert2s = db.format(sqlInsert2, params2);
				var params3 = [result[i].busiId._text, result[i].busiNm._text, result[i].busiCall._text];
				var sqlInsert3s = db.format(sqlInsert3, params3);
				db.query(sqlInsert1s + sqlInsert2s + sqlInsert3s, (err2, result2) => {
				});
			}
		})
	});
});

const light_load = schedule.scheduleJob('0 0 23 * * ?', function() {
	var sql = `UPDATE membership_fee SET member = light_load WHERE busiId IN ('EP', 'EV', 'GN', 'KL', 'KP', 'MO', 'PW');`;
	db.query(sql, (err, result) => {
		console.log('UPDATE light_load');
	});
});

const middle_load = schedule.scheduleJob('0 0 9,12,17 * * ?', function() {
	var sql = `UPDATE membership_fee SET member = middle_load WHERE busiId IN ('EP', 'EV', 'GN', 'KL', 'KP', 'MO', 'PW');`;
	db.query(sql, (err, result) => {
		console.log('UPDATE middle_load');
	});
});

const maximun_load = schedule.scheduleJob('0 0 10,13 * * ?', function() {
	var sql = `UPDATE membership_fee SET member = maximum_load WHERE busiId IN ('EP', 'EV', 'GN', 'KL', 'KP', 'MO', 'PW');`;
	db.query(sql, (err, result) => {
		console.log('UPDATE maximum_load');
	});
});
