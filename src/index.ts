//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator
//https://developers.google.com/web/tools/puppeteer/get-started
//https://molily.de/robust-javascript/#web-crawlers-without-javascript-support

//getting the odds margin to see if its profitable
// [1/(odds of event 1) + 1/(odds of event 2)} x 100


// import runSkyBetCrawler from './crawlers/skybetCrawler'
import EGBCrawler from './crawlers/egbCrawler'
import SkyBetCrawler from './crawlers/skybetCrawler'
import ArbSearch from './arbitrageSearch'
import {exampleCrawlerResponse} from './crawlers/resources/crawlResponse'

import sendMail from './emailer'
import * as dotenv from 'dotenv'
dotenv.config()         //load in the env variables

const egbCrawler = new EGBCrawler('egb')
const skyBetCrawler = new SkyBetCrawler('skybet')

const crawlerTask = async () => {
	console.log('Starting crawl task....')
  const skyResults = skyBetCrawler.run()
	const egbResults = egbCrawler.run()

	//waits for both functions to finish before continuing
 	const allResults = [await skyResults, await egbResults]; 
	
	const fullCrawlObject:any = {skybet: allResults[0], egb:allResults[1]}
	const arbFinder = new ArbSearch(fullCrawlObject)
	const findingsReport = arbFinder.search()

	await sendMail('Arbitrage Findings Report',findingsReport)
	console.log('Finishing crawl task....')
}

crawlerTask()

export default crawlerTask