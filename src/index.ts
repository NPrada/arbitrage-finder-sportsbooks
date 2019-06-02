//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator

import EGBCrawler from './crawlers/egbCrawler'
import SkyBetCrawler from './crawlers/skybetCrawler'
import BetwayCrawler from './crawlers/betwayCrawler'
import ArbSearch from './arbitrageSearch'
import sendMail from './emailer'
import * as dotenv from 'dotenv'
dotenv.config()         //load in the env variables

import {exampleCrawlerResponse} from './crawlers/resources/crawlResponse'

const egbCrawler = new EGBCrawler('egb')
const skyBetCrawler = new SkyBetCrawler('skybet')
const betwayCrawler = new BetwayCrawler('betway')

const crawlerTask = async () => {
	console.log('Starting crawl task....')
	const betwayResults = betwayCrawler.run()
  const skyResults = skyBetCrawler.run()
	const egbResults = egbCrawler.run()

	// waits for all functions to finish before continuing
	const allResults = [await egbResults, await skyResults, await betwayResults]; 

	const fullCrawlObject:any = {skybet: allResults[0], egb:allResults[1], betway: allResults[2]}
	
	const arbFinder = new ArbSearch(fullCrawlObject)
	const findingsReport = arbFinder.search()
	
	await sendMail('Arbitrage Findings Report',findingsReport)
	console.log('Finishing crawl task....')
}

crawlerTask()

export default crawlerTask