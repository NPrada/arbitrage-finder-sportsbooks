import cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import date from 'date-and-time'
import isNil from 'lodash/isNil'
import BaseCrawler, {RawMarketData, ParsedMarketData} from './baseCrawler';
import { parseHrtimeToSeconds, logHtml } from './resources/helpers'
import uniqid from 'uniqid'

//TODO this needs to be rewritten by hooking into their content api so its much more stable
class EGBCrawler extends BaseCrawler {
  baseURL = 'https://egb.com'

  run = async ():Promise<Array<ParsedMarketData>> => {
    try{
			const startTime = process.hrtime()

			const browser = await puppeteer.launch();
			const page = await browser.newPage();
      await page.goto(`${this.baseURL}/play/simple_bets`, { waitUntil: 'networkidle2' });
      await page.setUserAgent(this.fakeUA())
      await page.setViewport({width: 1500, height:2500})
      
			await page.waitForSelector("#app")
			await page.screenshot({path: 'egb-state1.png'});
			let allDom = await page.evaluate(() => {
        if(document !== null && document.getElementById("app") !== null) {         
          return document.getElementById("app")!.innerHTML
        }
      });


			if (isNil(allDom) || allDom === '')
				throw `${this.baseURL}/play/simple_bets got no dom`
	
			const $ = cheerio.load(allDom)
			const eventsTable = $('.table-bets', '.content').find('.table-bets__main-row-holder')
			if (eventsTable === null)
				throw `Error: could not find the table containing all the events`
	
			const matchDataList: Array<ParsedMarketData> = []
	
			for (let i = 0; i < eventsTable.length; i++) {
				const rawData = this.getRawRowData(eventsTable.eq(i))
        const parsedData = this.parseRawData(rawData)
        if (parsedData !== null) matchDataList.push(parsedData)
			}

			await browser.close();
      const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
			if(!matchDataList.length) {
				logHtml(allDom)
				await page.screenshot({path: 'egb-state2.png'});
				throw Error('No errors logged but we didnt get any match data at all try restarting')
			}
			console.log(`egb crawler finished in ${elapsedTime}s, and it fetched ${matchDataList.length} matches`)
			return matchDataList
		}catch(err){
			console.log("CRITICAL ERROR:",err)
			return []
		}
  }

  //gets the raw data for each field that then needs to be parsed
  getRawRowData = (tableRow: Cheerio | null): RawMarketData => {
    const matchData = this.initializeEventData()
    if (tableRow === null) {
      matchData.error = 'We could not find html for this table row'
      return matchData
    }

    if (tableRow.find('.table-bets__col-1').find('.no-border').text() !== '') { //check if you can still bet on the game
      matchData.error = 'This market is live or has expired'
      return matchData
    }

    
    matchData.date = tableRow.find("[itemprop='startDate']").attr('content')
    matchData.sportName = tableRow.find(".table-bets__content").find(".table-bets__event > img").attr('alt')
    matchData.eventName = tableRow.find("div[itemprop='location'] > [itemprop='name']").attr('content')
    matchData.team1.name = tableRow.find('.table-bets__player1 > span').attr('title')
    matchData.team2.name = tableRow.find('.table-bets__player2 > span').attr('title')
    matchData.team1.odds = tableRow.find('.table-bets__col-1').find('.bet-rate').text()
    matchData.team2.odds = tableRow.find('.table-bets__col-3').find('.bet-rate').text()
      
    //TODO add puppeteer click on row and get url since its just clientside 

    return matchData
  }

  //parses & cleans the data that was scraped, returns null if some field is blank so it does not get added to the results
  parseRawData = (rawRowData: RawMarketData): ParsedMarketData | null => {
    try{

			//look for any erros in the raw data and throw them if you find any
			const rawDataError = this.checkForErrors(rawRowData)
			if(rawDataError !== null){
				throw rawDataError
			}

			rawRowData.team1.odds = Number(rawRowData.team1.odds)
			rawRowData.team2.odds = Number(rawRowData.team2.odds)
			if (isNaN(rawRowData.team1.odds) || isNaN(rawRowData.team2.odds)) throw 'Could not convert the odd string to a number'
			

			let formattedDate: string
			if(date.isValid(rawRowData.date, 'YYYY-MM-DD HH:mm:ss')){
				const parsedDate:any = date.parse(rawRowData.date, 'YYYY-MM-DD HH:mm:ss')
				formattedDate = date.format(parsedDate,'YYYY-MM-DD HH:mm')
			} else throw 'Problem parsing the date'

      

      return {
				id: uniqid(),
				sportbookId: rawRowData.sportbookId,
				eventName: rawRowData.eventName,
        sportName: this.standardiseSportName(rawRowData.sportName),
				date: formattedDate,
				team1: {name: rawRowData.team1.name, odds: rawRowData.team1.odds},
				team2: {name: rawRowData.team2.name, odds: rawRowData.team2.odds}
      }
    }catch(e){
      console.log(e)
      return null
    }
  }
}

export default EGBCrawler