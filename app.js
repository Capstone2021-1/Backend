var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const indexRouter = require('./routes');
const userRouter = require('./routes/user');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/privkey.pem', 'utf-8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/cert.pem', 'utf-8');
const ca = fs.readFileSync('/etc/letsencrypt/live/www.evtalk.kr/fullchain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/', indexRouter);
app.use('/user', userRouter);


http.createServer(app).listen(80, () => {
	console.log('http server running on port 80');
});
https.createServer(credentials, app).listen(443, () => {
	console.log('https server running on port 443');
});
