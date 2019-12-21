//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator

import EGBCrawler from './crawlers/egbCrawler'
import SkyBetCrawler from './crawlers/skybetCrawler'
import BetwayCrawler from './crawlers/betwayCrawler'
import DataHandler, {FullCrawlObject} from './dataHandler'
import { findMarketObject, logJson } from "./crawlers/resources/helpers";
import sendMail from './emailer'
import {postFullCrawlObject} from  './apiClient'
import date from 'date-and-time'
import * as dotenv from 'dotenv'
dotenv.config()         //load in the env variables

const egbCrawler = new EGBCrawler('egb')
const skyBetCrawler = new SkyBetCrawler('skybet')
const betwayCrawler = new BetwayCrawler('betway')

const crawlerTask = async () => {
	console.log('Starting crawl task....')
	const betwayResults = await   betwayCrawler.run()
  const skyResults = await skyBetCrawler.run()
	// const egbResults = egbCrawler.run()

	// waits for all functions to finish before continuing, done this way so they all run concurrently
	//const allResults = [await skyResults, await betwayResults]; //await egbResults
	const allResults = [skyResults, betwayResults]
	const allGamesCrawled:any = {skybet: allResults[0], betway: allResults[1]} //egb:allResults[1]
	
	const arbFinder = new DataHandler(allGamesCrawled)
	const allGameContainers = arbFinder.matchGames()
	const findingsReport = arbFinder.getProfitability(allGameContainers)
	
 	const fullCrawlData: FullCrawlObject = {
		crawlDate: date.format(new Date(), 'YYYY/MM/DD HH:mm:ss'),
		crawlersData: [
			betwayCrawler.getCrawlMetadata(),
			skyBetCrawler.getCrawlMetadata(),
			//egbCrawler.getCrawlMetadata()
		],
		matchContainers: Object.keys(allGameContainers).map((key) => {
			return allGameContainers[key];
		})
	}

	await postFullCrawlObject(fullCrawlData) //put all data into db

	await sendMail('Arbitrage Findings Report',findingsReport)
	console.log('Finishing crawl task....')
}

crawlerTask()

export default crawlerTask