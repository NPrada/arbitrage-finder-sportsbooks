import request from 'request-promise-native'
import { UAs } from './resources/useragentList'
import date from 'date-and-time'
import uniqid from 'uniqid'
import isNil from 'lodash/isNil'
import puppeteer, {Page} from 'puppeteer'
export type SportName = "csgo" | "lol" | "dota2" | "rainbow6" | "sc2"| "overwatch" | "callofduty" | "rocketleague" //possible additions: hearthstone, rocket league(might have ties),
export type MarketNames = "outright"
export type SportBookIds = 'skybet' | 'egb' | 'betway'
export type ErrorSeverityLevels = 'CRITICAL' | 'NON_BLOCKING' 

export type RawBetData = {teamKey: 0|1|2, betName: string , odds: number | string}
export type BetData = {teamKey: 0|1|2, parentUuid: string, betName: string, odds: number} //teamkey 1 means its team 1, 0 means its the 3rd choice eg a draw

export type RawMarketData = {marketName: MarketNames, bets: Array<RawBetData>}
export type MarketData = {marketName: MarketNames, bets: Array<BetData>}

export interface RawGameData {
	sportbookId: SportBookIds
	competitionName: string | null
	sportName: string | null
	date: string | null
	team1Name: string | null
	team2Name: string | null
	markets: Array<RawMarketData>
	matchType?: string | null
	pageHref?: string | null
	error?: string | null
}



export interface ParsedGameData { 
	parentMatchesdId: string | null,
	uuid: string
	sportbookId: SportBookIds,
	competitionName: string
	sportName: string 		
	date: string 
	team1Name: string
	team2Name: string
	markets: Array<MarketData>
	matchType?: string 
	pageHref?: string
	error?: string 
}

export interface CrawlerMetadata {
	sportbookId: SportBookIds
	startDate: string
	elapsedTime: number
	isSuccessful: boolean
	gamesFound: Array<ParsedGameData>
	errorsList: Array<{uuid: string, severity: ErrorSeverityLevels, message: string}>
}

export default class BaseCrawler {
	errorTypes: {
		CRITICAL: ErrorSeverityLevels,
		NON_BLOCKING: ErrorSeverityLevels
	}

	crawlData: CrawlerMetadata
	sportbookId: SportBookIds
	constructor(sportbookId: SportBookIds, ) {
		this.sportbookId = sportbookId
		this.crawlData = {
			sportbookId: sportbookId,
			startDate: date.format(new Date(),'YYYY-MM-DD HH:mm:ss'),
			elapsedTime: 0,
			isSuccessful: true,
			gamesFound: [],
			errorsList: []
		}
		this.errorTypes = {CRITICAL: 'CRITICAL', NON_BLOCKING: 'NON_BLOCKING'}
	}

	sleep = require('util').promisify(setTimeout) //makes setTimeout return a promise so we can just use await
	
	initializeEventData = (): RawGameData => {
		return {
			sportbookId: this.sportbookId,
			competitionName: null,
			sportName: null,
			date: null,
			team1Name: null,
			team2Name: null,
			markets: []
		}
	}
	
	/**
	 * Looks for a sportname that we support a formats it in our accepted format
	 *
	 * @memberof BaseCrawler
	 */
	standardiseSportName = (rawSportName: string):SportName => {

		const parsedSportName = rawSportName.toLowerCase().replace(/ /g,'');
		
		const csgoRegex = /counter[-—:_\/]strike|cs[:|-]go|(?<!.)csgo(?!.)|(?<!.)counterstrike(globaloffensive|go)(?!.)/g
		const dota2Regex = /dota[-—:_\/]2|(?<!.)dota(2|)(?!.)/g
		const lolRegex = /(league|l)[-—:_\/](of|o)[-—:_\/](legends|l)|(?<!.)(lol|leagueoflegends)(?!.)/g
		const sc2Regex = /(?<!.)((starcraft|sc)[-—:_\/]2|(starcraft|sc)(2|))(?!.)/g
		const overwatchRegex = /(?<!.)(ow|overwatch)(?!.)/g
		const rainbow6Regex = /(?<!.)(r6|rainbow6|rainbow6siege|rainbow[-—:_\/]6[-—:_\/]siege|rainbow[-—:_\/](six|6))(?!.)/g
		const callofdutyRegex = /(?<!.)(callofduty|cod)(?!.)|(call|c)[-—:_\/](of|o)[-—:_\/](duty|d)/g
		const rocketLeagueRegex = /(?<!.)(rocketleague)(?!.)/g

		if(csgoRegex.test(parsedSportName))
				return 'csgo'
		else if(dota2Regex.test(parsedSportName))
				return 'dota2'
		else if(lolRegex.test(parsedSportName))
				return 'lol'
		else if(sc2Regex.test(parsedSportName))
				return 'sc2'
		else if(overwatchRegex.test(parsedSportName))
				return 'overwatch'
		else if(rainbow6Regex.test(parsedSportName))
				return 'rainbow6'
		else if(callofdutyRegex.test(parsedSportName))
				return 'callofduty'
		else if (rocketLeagueRegex.test(parsedSportName))
				return 'rocketleague'
		else{
				throw `unknown sportname -> ${parsedSportName}`
		}
	}
	
	/**
	 * gets a random user agent
	 *
	 * @memberof BaseCrawler
	 */
	fakeUA = (): string => {
		return UAs[Math.floor(Math.random() * UAs.length)]
	}

	/**
	 *	Reformat any odds type to the decimal type
		*
		* @param {*} rawOdd
		* @returns {number}
		*/
	formatOdds = (rawOdd: any):number => { //add a lot of unit tests
		if(rawOdd === '' )
			throw 'odds pattern was unrecognized (empty string)'

		let parsedOdd: number

		if(rawOdd.indexOf('/') !== -1){
			const twoNum: Array<string> = rawOdd.split('/')
			parsedOdd = Math.floor((Number(twoNum[0])/Number(twoNum[1])+1)*100)/100
		}else{
			parsedOdd = Number(rawOdd)
		}
		
		if(isNaN(parsedOdd)) throw 'odd pattern was unrecognized & could not convert to number'

		return parsedOdd
	}

	/**
	 * formats all the odds of an array of BetData objects
	 * @param bets 
	 */
	formatAllMarketOdds (bets:Array<RawBetData>,parentUuid:string):Array<BetData> {
		try {
			return bets.map((element: any) => {
				return {
					teamKey: element.teamKey, 
					betName: element.betName,
					parentUuid: parentUuid,
					odds: this.formatOdds(element.odds)
				}
			});
		} catch(err) {
			throw err + ' -  bets object: ' + bets
		}
		
	}

	/**
	 * checks for any errors and throws them if it finds any
	 *
	 * @memberof BaseCrawler
	 */
	checkForErrors = (rawMarketData: RawGameData): string | null => {

		if (rawMarketData.error) return rawMarketData.error
		if (!rawMarketData.sportName) return 'No raw sport name was found'   	
		if (!rawMarketData.date) return 'No raw date info was found'        	
		if (!rawMarketData.competitionName) return 'No raw event name was found'   	
		if (!rawMarketData.team1Name || !rawMarketData.team2Name) return 'No team name data was found'
		//TODO add checks for the single bets
		// if (!rawMarketData.team1.name || !rawMarketData.team2.name) return 'No raw team name was found'
		// if (!rawMarketData.team1.odds || !rawMarketData.team2.odds) return 'No raw team odds were found'
		
		return null
	}

	/**
	 * makes a http request and returns the entire dom
	 *
	 * @memberof BaseCrawler
	 */
	fetchHtml = async (url: string): Promise<string> => {
		let allDom = ''
		await request({
				url: url,
				// @ts-ignore
				'User-Agent': this.fakeUA()
		}, (error: any, response: any, html: string) => {
				if (!error && response.statusCode && html !== null) {
						allDom = html
				}
		})
		return allDom
	}
	
	/**
	 * return the crawl data that was we wrote so far
	 *
	 * @memberof BaseCrawler
	*/
	getCrawlMetadata () {
		return this.crawlData
	}

	/**
	 * applies a regex to a string and throws an error if it fails in some way
	 *
	 * @memberof BaseCrawler
	*/
	getRegexSubstr = (string: string, regex: RegExp):string => {
		if (string === '') throw ' getRegexSubstr() the string we are ment to match with is blank';

		if (regex.test(string) && string.match(regex)!.length === 1) {
				return string.match(regex)![0].trim()
		} else {
				throw `at getRegexSubstr() some error with finding the substring using ${regex} on ${string}`;
		}
	}
	/**
	 * saves the error object into this.BaseCrawler.errors
	 * 
	 * @memberof BaseCrawler
	*/
	saveError = async (severity:ErrorSeverityLevels, message: string, puppeteerPage: any = null) => {

		const { errorTypes, sportbookId } = this
		const errId = uniqid()
		let builtMessage = ''

		if (severity === errorTypes.NON_BLOCKING) {
			builtMessage = `Non Blocking Error: ${message}`
		} else if (severity === errorTypes.CRITICAL){
			this.crawlData.isSuccessful = false
			builtMessage = `${severity} ERROR: ${message}}`
		}
		console.log(`(${sportbookId}) ${builtMessage}`)
		//take a screenshot 
		if(severity === errorTypes.CRITICAL && !isNil(puppeteerPage))
			await puppeteerPage.screenshot({path: `error-${errId}.png`});

		this.crawlData.errorsList.push({uuid: errId, severity: severity, message: message})
	}


	/**
	 *
	 * simple function used to make sure we only return valid keys 
	 * @param {number} index
	 * @returns {(0 | 1 | 2)}
	 * @memberof BaseCrawler
	 */
	getTeamKey (index: number): 0 | 1 | 2 {
		let teamKey: 0 | 1 | 2 = 0
		if (index === 1)
			teamKey = 1
		else if (index === 2)
			teamKey = 2

		return teamKey
	}


	/**
	 *
	 * 
	 * @param {*} domsGetter
	 * @returns
	 * @memberof BaseCrawler
	 */
	async runPuppeteer (domsGetter: (page:Page, browser:any,) => any){
		let browser = null
		let page = null
		try{
			browser = await puppeteer.launch({
				ignoreHTTPSErrors: true, 
				args: ['--no-sandbox','--disable-setuid-sandbox']
			});
			page = await browser.newPage();
			await page.setUserAgent(this.fakeUA())
			await page.setViewport({width: 1500, height:2500})

		 const result = await domsGetter(page, browser )
		 if (!isNil(browser)) await browser.close()
		 return result
		} catch(err) {

			if (!isNil(browser)) await browser.close()
			throw err
		}
	}
}