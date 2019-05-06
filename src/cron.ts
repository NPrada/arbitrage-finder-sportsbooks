import cron from 'node-cron'
import crawlerTask from './index'

//will run the task every 53 minutes
cron.schedule('*/53 * * * *', crawlerTask);

