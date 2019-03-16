//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator
//https://developers.google.com/web/tools/puppeteer/get-started
//https://molily.de/robust-javascript/#web-crawlers-without-javascript-support

//getting the odds margin to see if its profitable
// [1/(odds of event 1) + 1/(odds of event 2)} x 100


// import runSkyBetCrawler from './crawlers/skybetCrawler'
import {ParsedMarketData} from './crawlers/baseCrawler'
import EGBCrawler from './crawlers/egbCrawler'
import SkyBetCrawler from './crawlers/skybetCrawler'
import ArbSearch from './arbitrageSearch'
import {exampleCrawlerResponse} from './crawlers/resources/crawlResponse'

const egbCrawler = new EGBCrawler('egb')
const skyBetCrawler = new SkyBetCrawler('skybet')

const crawlerTask = async () => {
  const skyResults = skyBetCrawler.run()
	const egbResults = egbCrawler.run()
	
	const allResuls = [await skyResults, await egbResults]; //waits for both functions to finish before continuing
  // console.log(egbResults)
	// const fullCrawlObject = {skybet: skyResults, egb:egbResults}
	// const arbFinder = new ArbSearch(fullCrawlObject)
	// arbFinder.search()
}

crawlerTask()