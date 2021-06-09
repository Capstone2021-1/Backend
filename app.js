var http = require('http');
var https = require('https');
var fs = require('fs');
var admin = require('firebase-admin');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
})

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

var db = require('./mysql');
var server = https.createServer(credentials, app);
var io = require('socket.io')(server);

io.sockets.on('connection', (socket) => {
    console.log(`Socket connected : ${socket.id}`)

    socket.on('enter', (data) => {
        const roomData = JSON.parse(data)
        const username1 = roomData.username1
	const username2 = roomData.username2
        const roomNumber = roomData.roomNumber

	db.query("SELECT * FROM messageRoom WHERE roomNumber = ?", roomNumber, (err, result) => {
		if(err) console.log(err)
		else {
			if(result.length == 1) db.query("UPDATE messageRoom SET user1 = ?, user2 =? WHERE roomNumber = ?", [username1, username2, roomNumber], (err2, result2) => {})
			else db.query("INSERT INTO messageRoom VALUES (?, ?, ?)", [roomNumber, username1, username2], (err2, result2) => {})
		}
	});
    
        socket.join(`${roomNumber}`)
        console.log(`[Username : ${username1}] entered [room number : ${roomNumber}]`)
        db.query("SELECT * FROM messageData WHERE messageData.to=?", roomNumber, (err, result) => {
            if(err) console.log(err)
            else {
                for(var i = 0; i < result.length; i++)
                    io.to(`${result[i].to}`).emit('update', JSON.stringify(result[i]))
            }
        })

        const enterData = {
            type : "ENTER",
            content : `${username1} entered the room`  
          }
          socket.broadcast.to(`${roomNumber}`).emit('update', JSON.stringify(enterData))
    })

    socket.on('newMessage', (data) => {
        const messageData = JSON.parse(data)
        db.query("INSERT INTO messageData VALUES (?, ?, ?, ?, ?)", [messageData.type, messageData.from, messageData.to, messageData.content, messageData.sendTime], (err, reuslt) => {
            if(err) console.log(err)
        })

	var target_id = messageData.to.replace(messageData.sendUserId, '');
	db.query("SELECT car_number, token FROM user WHERE id = ?", target_id, (err, result) => {
		if(err) console.log(err)
		else {
			var target_token = result[0].token;
			var message = {
				notification: {
					title: messageData.from,
					body: messageData.content,
				},
				data: {
					username1: result[0].car_number,
					username2: messageData.from,
					roomNumber: messageData.to,
				},
				token: target_token,
			}

			admin.messaging().send(message)
			.then(function (response) {
				console.log('Successfully sent message: : ', response)
				//return res.status(200).json({success : true})
			})
			.catch(function (err) {
				console.log('Error Sending message!!! : ', err)
			//	return res.status(400).json({success : false})
			});

		}
	})
        io.to(`${messageData.to}`).emit('update', JSON.stringify(messageData))
    })

    socket.on('getList', (data) => {
	const messageData = JSON.parse(data);
	db.query("SELECT * FROM messageRoom WHERE roomNumber like '%?%'", messageData, (err, roomList) => {
		for(var i = 0; i < roomList.length; i++) {
			db.query('SELECT roomNumber, user1, user2, content FROM messageRoom inner join messageData on roomNumber = messageData.to WHERE sendTime = (SELECT max(sendTime) FROM messageData WHERE messageData.to = ?);', roomList[i].roomNumber, (err2, lastContent) => {
				socket.emit("sendRoomList", JSON.stringify({
					roomNumber : lastContent[0].roomNumber,
					username1 : lastContent[0].user1,
					username2 : lastContent[0].user2,
					content : lastContent[0].content
				}))
			})
		}
	});

    })

    socket.on('removeChat', (data) => {
	const roomNumber = JSON.parse(data)
	const sql1 = `DELETE FROM messageRoom WHERE roomNumber = ${roomNumber};`;
	const sql2 = `DELETE FROM messageData WHERE messageData.to = ${roomNumber};`;
	db.query(sql1 + sql2, (err, result) => {
		if(err) console.log(err)
	})

    })

    socket.on('left', (data) => {
        const roomData = JSON.parse(data)
        const username1 = roomData.username1
        const roomNumber = roomData.roomNumber
    
        socket.leave(`${roomNumber}`)
        console.log(`[Username : ${username1}] left [room number : ${roomNumber}]`)

        const leftData = {
            type : "LEFT",
            content : `${username1} left the room`  
          }
          socket.broadcast.to(`${roomNumber}`).emit('update', JSON.stringify(leftData))
    })

    socket.on('disconnect', () => {
        console.log(`Socket disconnected : ${socket.id}`)
    })
})

http.createServer(app).listen(80, () => {
	console.log('http server running on port 80');
});

server.listen(443, () => {
	console.log('https server running on port 443');
});

