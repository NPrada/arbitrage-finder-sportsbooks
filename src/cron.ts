import cron from 'node-cron'
import crawlerTask from './index'
import util from 'util';
import * as child_process from 'child_process';

//will run the task every 53 minutes
cron.schedule('*/53 * * * *', crawlerTask);

process.on('exit', async (code) => {
  try {
      const { stdout, stderr } = await exec('killall chrome');
  }catch (err) {
    console.error(err);
  };
})

// var kill  = require('tree-kill');
// process.on('exit', (code) => {
//   kill(child.pid, 'SIGTERM', function(err){
//     kill(child.pid, 'SIGKILL', function(err){
//       process.kill(-child.pid);
//     });
//   });
// });



