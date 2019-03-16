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

const egbCrawler = new EGBCrawler('egb')
const skyBetCrawler = new SkyBetCrawler('skybet')

const crawlerTask = async () => {
  const skyResults = await skyBetCrawler.run()
	// console.log(skyResults)
  const egbResults = await egbCrawler.run()
  // console.log(egbResults)
	const fullCrawlObject = {skybet: skyResults, egb:egbResults}
	const arbMatcher = new ArbSearch(fullCrawlObject)
	arbMatcher.search()
}

crawlerTask()