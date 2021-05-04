const schedule = require('node-schedule');

const job = schedule.scheduleJob('42 * * * * *', function(){
  console.log('Hello, node-schedule');
});
