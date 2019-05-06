import cheerio from "cheerio";
import puppeteer, {Page} from 'puppeteer'
import date from 'date-and-time'
import BaseCrawler, {RawGameData, ParsedGameData} from "./baseCrawler";
import uniqid from 'uniqid'
import { parseHrtimeToSeconds, logHtml, waitForNetworkIdle } from './resources/helpers'
import isNil = require("lodash/isNil");


export default class BetwayCrawler extends BaseCrawler {
	baseURL = 'https://sports.betway.com'

	run = async () => { //:Promise<Array<ParsedGameData>>
		const startTime = process.hrtime()

			const browser = await puppeteer.launch({
				//'args' : [ '--incognito' ],
				headless: false,
				//slowMo: 100
			}); 
			
			const page = await browser.newPage();
			await page.setUserAgent(this.fakeUA())
			await page.setViewport({width: 1500, height:2500})
			
			const csgoHtml = await this.getDom(page, `${this.baseURL}/en/sports/sct/esports/cs-go`)

			const daysList = this.getDayTableCheerio(csgoHtml)
			
			await page.screenshot({path: 'debugging/betway-state.png'});	
			const matchDataList: Array<ParsedGameData> = []
			for (let i = 0; i < daysList.length; i++) {
				matchDataList.push(...this.getMatchDataFromDayTable(daysList[i]))
			}


		
			
			await browser.close();
		const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
		console.log(`betway crawler finished in ${elapsedTime}s`);
		
	}





	getMatchDataFromDayTable (Cheerio: Cheerio):Array<ParsedGameData> {

		if(isNil(Cheerio)){
			console.log('Error: something was undefined for some reason');
			return []
		}
			
		if(isNil(Cheerio.attr('collectionitem'))){
			console.log(Cheerio.html());
		}

		const raw_SportAndDayAndTournamentName = Cheerio.attr('collectionitem')
		const gameRows = Cheerio.find('.eventItemCollection > .oneLineEventItem')
		
		for (let i = 0; i < gameRows.length; i++) {
			const gameRow = gameRows.eq(i);

			this.getRawRowData(gameRow, raw_SportAndDayAndTournamentName)

			
		}

		return []
	}

	parseRawData(rawRowData:RawGameData):ParsedGameData {
		try{
			
			const uuid = uniqid()

			//look for any erros in the raw data and throw them if you find any
			const rawDataError = this.checkForErrors(rawRowData)
			if(rawDataError !== null){
				throw rawDataError
			}

			//format all the bets odds in the outright market
			const outrightBets = this.formatAllMarketOdds(rawRowData.markets.outright,uuid)
			
			//parse & format the date
			let formattedDate: string
			if(date.isValid(rawRowData.date, 'YYYY-MM-DD HH:mm:ss')){
				const parsedDate:any = date.parse(rawRowData.date, 'YYYY-MM-DD-HH:mm:ss')
				formattedDate = date.format(parsedDate,'YYYY-MM-DD HH:mm')
			} else throw 'Problem parsing the date'

			console.log('date:',formattedDate);
			

			return {
				uuid: uuid,
				parentMatchesdId: null,
				sportbookId: rawRowData.sportbookId,
				competitionName: rawRowData.competitionName,
        sportName: this.standardiseSportName(rawRowData.sportName),
				date: formattedDate,
				team1Name: rawRowData.team1Name,
				team2Name: rawRowData.team2Name,
				markets: { 
					outright: {	bets:  outrightBets	}  
				}
      }

		}catch(e){
			console.log('(betway) Non Blocking Error: ' + e)
      return null
		}


	}


	getRawRowData(tableRow: Cheerio, raw_SportAndDayAndTournamentName:string):RawGameData {
		const parsed_SportAndDayAndTournamentName = raw_SportAndDayAndTournamentName.split('_').filter(elem => elem !== 'esports')
	
		const rawMatchData = this.initializeEventData()
		rawMatchData.competitionName = parsed_SportAndDayAndTournamentName[1]
		rawMatchData.competitionName = parsed_SportAndDayAndTournamentName[0]
		rawMatchData.team1Name = tableRow.find('.eventDetails').find('.teamNameHome').find('.teamNameFirstPart').text()
		rawMatchData.team2Name = tableRow.find('.eventDetails').find('.teamNameAway').find('.teamNameFirstPart').text()
		rawMatchData.date = 
			parsed_SportAndDayAndTournamentName[2] + 
			'-' + 
			tableRow.find('.eventDetails').find('.oneLineDateTime').text()
		rawMatchData.pageHref = tableRow.find('.eventDetails').find('.scoreboardInfoNames').attr('href')
		

		const betCells = tableRow.find('.eventMarket').find('.baseOutcomeItem')
			
		for (let i = 0; i < betCells.length; i++) {
			rawMatchData.markets.outright.bets.push(
				{teamKey: i+1, betName:'win', odds: betCells.eq(i).find('.oddsDisplay').text()}
			)		
		}

		return rawMatchData
	}




	/**
	 * gets the cheerio elements for each day day of matches per tournament
	 * @param fullPageHtml 
	 */
	getDayTableCheerio (fullPageHtml:string):Array<Cheerio> {
		const $ = cheerio.load(fullPageHtml)
		const rawDaysList = $('.eventTableItemCollection[data-widget*="EventTableListWidget"]')

		//get a list of all the day tables in this page
		const daysList:Array<Cheerio> = [];
		for (let i = 0; i < rawDaysList.length; i++) {
			const dayTable = rawDaysList.eq(i);
			if (dayTable.children().length > 1){
					for (let k = 0; k < dayTable.children().length; k++) {
						daysList.push(dayTable.children().eq(k))
					}
			} else {
				daysList.push(dayTable.children())
			}
		}

		return daysList
	}
	

	/**
	 * Expands all the buttons and returns the raw html
	 *
	 * @memberof BetwayCrawler
	 */
	getDom = async (page:Page, url:string):Promise<string> => {
		
		await page.goto(url, { waitUntil: 'networkidle0' });
	
		let buttonsNum = 0;
		do{
			const handles = await page.$$('.collapsableHeader[collapsed=true]');
			buttonsNum = handles.length
			console.log('legnth', handles.length);
			await handles[0].click()
			
		}while(buttonsNum > 1)
	
		await waitForNetworkIdle(page,100,0)
		console.log('gotten dom');
		
		const html = await page.content()
		return html;
	}
}