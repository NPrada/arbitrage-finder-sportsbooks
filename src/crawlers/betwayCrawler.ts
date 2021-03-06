import cheerio from "cheerio";
import puppeteer, {Page} from 'puppeteer'
import date from 'date-and-time'
import BaseCrawler, {RawGameData, ParsedGameData, MarketData, RawMarketData} from "./baseCrawler";
import uniqid from 'uniqid'
import random from 'lodash/random'
import { parseHrtimeToSeconds, logHtml, waitForNetworkIdle, logJson } from './resources/helpers'
import isNil = require("lodash/isNil");


export default class BetwayCrawler extends BaseCrawler {
	baseURL = 'https://sports.betway.com'

	run = async ():Promise<Array<ParsedGameData>> => {
		let browser = null
		let page = null
		try{
			const startTime = process.hrtime()

			let allDoms = await this.runPuppeteer(async (page, browser) => {
				const maxRequestDelay = 4;	//in seconds
				const minRequestDelay = 1;
				const allHtml:any = {}

				allHtml.csgoHtml = await this.getDom(page, `/en/sports/sct/esports/cs-go`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 12.5% crawling complete');
				allHtml.lolHtml = await this.getDom(page, `/en/sports/sct/esports/league-of-legends`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 25% crawling complete');
				allHtml.dota2Html = await this.getDom(page, `/en/sports/sct/esports/dota-2`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 37.5% crawling complete');
				allHtml.rainbowHtml = await this.getDom(page, `/en/sports/sct/esports/rainbow-six`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 50% crawling complete');
				allHtml.overwatchHtml = await this.getDom(page, `/en/sports/sct/esports/overwatch`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 62.5% crawling complete');
				allHtml.sc2Html = await this.getDom(page, `/en/sports/sct/esports/starcraft-2`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 75% crawling complete');
				allHtml.hearthsoneHtml = await this.getDom(page, `/en/sports/sct/esports/hearthstone`)
				await this.sleep(random(minRequestDelay,maxRequestDelay)*1000) 
				console.log('(betway) 87.5% crawling complete');
				
				return allHtml
			})

			const sportDaysLists = []

			sportDaysLists.push(this.getDaysTableCheerio(allDoms.csgoHtml))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.lolHtml))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.dota2Html))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.rainbowHtml))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.overwatchHtml))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.sc2Html))
			sportDaysLists.push(this.getDaysTableCheerio(allDoms.hearthsoneHtml))

			const matchDataList: Array<ParsedGameData> = []
			for (let k = 0; k < sportDaysLists.length; k++) {
				const daysList = sportDaysLists[k];
				for (let i = 0; i < daysList.length; i++) {
					matchDataList.push(...this.getMatchDataFromDayTable(daysList[i]))
				}
			}
			
		const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
		this.crawlData.elapsedTime = Number(elapsedTime)
		this.crawlData.gamesFound = matchDataList
		console.log(`betway crawler finished in ${elapsedTime}s, and it fetched ${matchDataList.length} games`)
		return matchDataList;
		} catch(err) {
			this.saveError(this.errorTypes.CRITICAL, err, page)
      return []
    }	
	}


	getMatchDataFromDayTable (Cheerio: Cheerio):Array<ParsedGameData> {

		if(isNil(Cheerio)){
			console.log('Error: something was undefined for some reason');
			return []
		}
			
		if(isNil(Cheerio.attr('collectionitem'))){
			console.log('(betway) Error: we did not find a collectionitem');
			console.log(Cheerio.html());
		}

		const matchDataList: Array<ParsedGameData> = []

		const raw_SportAndTournamentNameAndDay = Cheerio.attr('collectionitem')
		const gameRows = Cheerio.find('.eventItemCollection > .oneLineEventItem')
		
		for (let i = 0; i < gameRows.length; i++) {
			const gameRow = gameRows.eq(i);

			const rawData = this.getRawRowData(gameRow, raw_SportAndTournamentNameAndDay)
			const parsedData = this.parseRawData(rawData)
			if (parsedData !== null) matchDataList.push(parsedData)

		}

		return matchDataList
	}

	getRawRowData(tableRow: Cheerio, raw_SportAndTournamentNameAndDay:string):RawGameData {
		const parsed_SportAndTournamentNameAndDay = raw_SportAndTournamentNameAndDay.split('_').filter(elem => elem !== 'esports')
	
		const rawMatchData = this.initializeEventData()
		rawMatchData.competitionName = parsed_SportAndTournamentNameAndDay[1]
		rawMatchData.sportName = parsed_SportAndTournamentNameAndDay[0]
		rawMatchData.team1Name = tableRow.find('.eventDetails').find('.teamNameHome').find('.teamNameFirstPart').text()
		rawMatchData.team2Name = tableRow.find('.eventDetails').find('.teamNameAway').find('.teamNameFirstPart').text()
		rawMatchData.date = 
			parsed_SportAndTournamentNameAndDay[2] + 
			'-' + 
			tableRow.find('.eventDetails').find('.oneLineDateTime').text()
		rawMatchData.pageHref = tableRow.find('.eventDetails').find('.scoreboardInfoNames').attr('href')
		

		const betCells = tableRow.find('.eventMarket').find('.baseOutcomeItem')

		const outrightData: RawMarketData = { marketName: 'outright', bets: []}
		for (let i = 0; i < betCells.length; i++) {
			outrightData.bets.push(
				{teamKey: this.getTeamKey(i+1), betName:'win', odds: betCells.eq(i).find('.oddsDisplay').text()}
			)		
		}
		rawMatchData.markets.push(outrightData)

		return rawMatchData
	}


	parseRawData(rawRowData:RawGameData):ParsedGameData {
		try{
			
			const id = uniqid()

			//look for any erros in the raw data and throw them if you find any
			const rawDataError = this.checkForErrors(rawRowData)
			if(rawDataError !== null){
				throw rawDataError
			}

			//format all the bets odds in the markets
			const parsedMarkets = rawRowData.markets.map((elem: RawMarketData):MarketData => {
				const parsedMarketData: MarketData = {
					...elem,
					bets: this.formatAllMarketOdds(elem.bets, id)
				}
				return parsedMarketData
			})
			
			
			//parse & format the date
			let formattedDate: string
			if(date.isValid(rawRowData.date, 'YYYY-MM-DD-HH:mm')){
				const parsedDate:any = date.parse(rawRowData.date, 'YYYY-MM-DD-HH:mm')
				formattedDate = date.format(parsedDate,'YYYY-MM-DD HH:mm')
			} else throw `Problem parsing the date. Tried to parse: '${rawRowData.date}'`

			return {
				id: id,
				parentMatchesdId: null,
				sportbookId: rawRowData.sportbookId,
				competitionName: rawRowData.competitionName,
        sportName: this.standardiseSportName(rawRowData.sportName),
				date: formattedDate,
				team1Name: rawRowData.team1Name,
				team2Name: rawRowData.team2Name,
				markets: parsedMarkets
      }

		}catch(err){
			this.saveError(this.errorTypes.NON_BLOCKING, err)
      return null
		}
	}

	/**
	 * gets the cheerio elements for each day day of matches per tournament
	 * @param fullPageHtml 
	 */
	getDaysTableCheerio (fullPageHtml:string):Array<Cheerio> {
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
	getDom = async (page:Page, urlPath:string):Promise<string> => {
		
		await page.goto(this.baseURL + urlPath);
		try{
			await page.waitForSelector('.endpoint.node > div')

			if(!page.url().includes(urlPath)) return ''
			
			await page.waitForSelector('.eventTableItemCollection[data-widget*="EventTableListWidget"]')
		} catch (err){
			console.log('(betway) Error: waiting for selector failed, url:' + urlPath + ' - '+ err) //TODO make sure this gets safely added to the errors
		}
		
		let buttonsNum = 0;
		do {
			const handles = await page.$$('.collapsableHeader[collapsed=true]');
			buttonsNum = handles.length
			if(!isNil(handles[0])){
				await handles[0].click()
			}
			await this.sleep(500)
		} while (buttonsNum > 1)
	
		await this.sleep(1000)
		
		const html = await page.content()
		return html;
	}
}