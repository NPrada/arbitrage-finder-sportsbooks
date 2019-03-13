import cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import isNil from 'lodash/isNil'
import BaseCrawler, { EventData, SportName } from './baseCrawler';
import { parseHrtimeToSeconds } from './resources/helpers'


//TODO this needs to be rewritten by hooking into their content api so its much more stable
class EGBCrawler extends BaseCrawler {
  baseURL = 'https://egb.com'

  run = async () => {
    //const allDom = await fetchHtml(`${baseURL}/play/simple_bets`);
    const startTime = process.hrtime()

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${this.baseURL}/play/simple_bets`, { waitUntil: 'networkidle2' });

    let allDom = await page.evaluate(() => document.body.innerHTML);

    if (isNil(allDom) || allDom === '')
      throw `${this.baseURL}/play/simple_bets got no dom`

    const $ = cheerio.load(allDom)
    const eventsTable = $('.table-bets', '.content').find('.table-bets__main-row-holder')

    if (eventsTable === null)
      throw `Error: could not find the table containing all the events`

    const matchDataList: Array<EventData> = []

    for (let i = 0; i < eventsTable.length; i++) {
      const rawData = this.getRawRowData(eventsTable.eq(i))
      const parsedData = this.parseRowData(rawData)
      if (parsedData !== null) matchDataList.push(parsedData)
    }



    await browser.close();
		const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
		
    console.log(`egb crawler finished in ${elapsedTime}s, and it fetched ${matchDataList.length} matches`)
    return matchDataList
  }

  parseRowData = (rawRowData: EventData): EventData | null => {

    //check if any values are not truthy (null || "" || 'undefined' etc..)
    if (!rawRowData.sportName) return null   	//TODO throw an error and log it
    if (!rawRowData.date) return null        	//TODO throw an error and log it
    if (!rawRowData.eventName) return null   	//TODO throw an error and log it
    if (!rawRowData.team1 || !rawRowData.team2) return null
    if (!rawRowData.team1.name || !rawRowData.team2.name) return null
    if (!rawRowData.team1.odds || !rawRowData.team2.odds) return null
		if (rawRowData.error) return null  				//TODO throw an error and log it	

		const sportNameRegex = /.+(?=game)/g
		//TODO convert the sportnames so they match, eg: cs:go -> csgo

    return {
      ...rawRowData,
      sportName: this.applyRegex(rawRowData.sportName, sportNameRegex).trim().toLowerCase(),
      date: rawRowData.date, //TODO add a check to see if it matches the format we want to store with
    }
  }

  getRawRowData = (tableRow: Cheerio | null): EventData => {
    const matchData = this.initializeEventData()
    if (tableRow === null) {
      matchData.error = 'We could not find html for this table row'
      return matchData
    }

    if (tableRow.find('.table-bets__col-1').find('.no-border').text() !== '') {
      matchData.error = 'This market is live or has expired'
      return matchData
    }


    matchData.date = tableRow.find("[itemprop='startDate']").attr('content')
    matchData.sportName = tableRow.find(".table-bets__content > [itemprop='name']").attr('content')
    matchData.eventName = tableRow.find("div[itemprop='location'] > [itemprop='name']").attr('content')
    matchData.team1.name = tableRow.find('.table-bets__player1 > span').attr('title')
    matchData.team2.name = tableRow.find('.table-bets__player2 > span').attr('title')
    matchData.team1.odds = tableRow.find('.table-bets__col-1').find('.bet-rate').text()
    matchData.team2.odds = tableRow.find('.table-bets__col-3').find('.bet-rate').text()

    //TODO add puppeteer click on row and get url since its just clientside 

    return matchData
  }
}

export default EGBCrawler