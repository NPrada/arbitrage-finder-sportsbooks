import cron from 'node-cron'
import crawlerTask from './index'

//will run the task every 32 minutes
cron.schedule('*/32 * * * *', crawlerTask);

