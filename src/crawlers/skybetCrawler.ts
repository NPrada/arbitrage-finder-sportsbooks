import cheerio from 'cheerio'
import date from 'date-and-time'
import isNil from 'lodash/isNil'
import random from 'lodash/random'
import BaseCrawler, { RawGameData ,ParsedGameData,MarketData, RawMarketData } from './baseCrawler';
import {parseHrtimeToSeconds} from './resources/helpers'
import uniqid from 'uniqid'

type extraDataType = {date: string}

class SkyBetCrawler extends BaseCrawler {
  baseURL = 'https://m.skybet.com';

  run = async ():Promise<Array<ParsedGameData>> => {
    try{
      const startTime = process.hrtime()

      const baseUrlDom = await this.fetchHtml(`${this.baseURL}/esports`);
			const allMatchesPath = await this.getPathToAllMatchesByDay(baseUrlDom) 

			//just wait random time before fetching the next page to thow off that we are a bot
			await this.sleep(random(3,15)*1000)  //waits between 3-15s
			
      let allDom = await this.fetchHtml(`${allMatchesPath}`); //${baseURL}${allMatchesPath}
  
      const $ = cheerio.load(allDom);
      const allDayTables = $('ul.table-group', '#page-content').find('li')
  
      const matchDataList: Array<ParsedGameData> = []
      for (let i = 0; i < allDayTables.length; i++) {
        matchDataList.push(...this.getMatchDataFromDayTable(allDayTables.eq(i).html()))
      }
			
			const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
			this.crawlData.elapsedTime = Number(elapsedTime)
			this.crawlData.gamesFound = matchDataList.map((elem: ParsedGameData):string => {
				return elem.uuid
			})
      console.log(`skybet crawler finished in ${elapsedTime}s, and it fetched ${matchDataList.length} games`)
			return matchDataList;
    }catch(err){
			this.saveError(this.errorTypes.CRITICAL, err)
      return []
    }
  }

  getPathToAllMatchesByDay = async (allDom: string | null): Promise<string> => {

    if (isNil(allDom) || allDom === '')
      throw Error('getAllMatchesByDayPath got no table html to work with')

    const $ = cheerio.load(allDom);
    const marketsListPath = $("#coupons", '#page-content')
			 .find("[data-analytics='[Coupons]']").filter((_index,elem) => { 	//flexible way of find the button that says: "All Matches By Day" so the matching is not case sensitive
				return ($(elem).find("div").text()
										.trim()
										.toLowerCase()
										.split(' ')
										.join('')
										.indexOf("allmatchesbyday") !== -1)
      })
      .attr('href')

      
    if (isNil(marketsListPath)) throw Error(`Crawler was unable to get the link to the markets by day page, what it got was null, probably the location of the "All Matches By Day" button has changed`)
  
    return this.baseURL + marketsListPath
  }

  getMatchDataFromDayTable = (tableHtml: string | null): Array<ParsedGameData> => {

    if (isNil(tableHtml) || tableHtml === '')
      throw Error('getMatchDataFromDayTable got no table html to work with')

    const $ = cheerio.load(tableHtml);

    const data: Array<ParsedGameData> = []
    let rowElem: Cheerio
    let currHeaderText: string = ''

    const date = $('h2 > span').text()
    const tableRows = $('tbody > tr')

    for (let i = 0; i < tableRows.length; i++) {
      const rawMatchData = this.initializeEventData()
    
      //go through the rows on by one
      rowElem = tableRows.eq(i)
      const rowHeaderText = rowElem.find('td.group-header').text().trim(); //eg: LOL - LEC – 21:10
      
      if (rowHeaderText !== '') {
        currHeaderText = rowHeaderText //update theheader text with the latest one found
      } else {
        
        const matchNameString = rowElem.find('a[href] > b').text()
        const matchHref = rowElem.find('a[href]').attr('href')
        //TODO confirm it does not find suspended outcomes
        const odds1 = rowElem.not('.outcome--is-suspended')
          .find('.cell--price')
          .find('.js-oc-price')
          .first().text().trim()

        const odds2 = rowElem.not('.outcome--is-suspended')
          .find('.cell--price')
          .find('.js-oc-price')
          .last().text().trim()
        
        if (!matchHref) rawMatchData.error =  'could not find the match link'
        
        rawMatchData.date = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
        rawMatchData.competitionName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
        rawMatchData.sportName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
				rawMatchData.pageHref = this.baseURL + matchHref
				rawMatchData.team1Name = matchNameString 	// eg:'Infinity eSports v Pixel Esports Club (Bo1)'
				rawMatchData.team2Name = matchNameString	// eg:'Infinity eSports v Pixel Esports Club (Bo1)'
				rawMatchData.markets = []
				rawMatchData.markets.push({
					marketName: 'outright',
					bets:	[
						{teamKey: 1, betName: 'win', odds: odds1},
						{teamKey: 2, betName: 'win', odds: odds2},
					]
				})
					
        const parsedRowData = this.parseRawData(rawMatchData, {date: date})
        
        if(parsedRowData !== null) data.push(parsedRowData)
      }
    }
    return data;
    }
  
  parseRawData = (rawRowData: RawGameData, extraData: extraDataType): ParsedGameData | null => {
    try{

			//look for any erros in the raw data and throw them if you find any
			const rawDataError = this.checkForErrors(rawRowData)
			if(rawDataError !== null){
				throw rawDataError
			}
      const uuid = uniqid()
      const team1regx = /(^.+?((?=\s\d\sv\s)|(?=\sv\s)))/g			//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
      const team2regx = /.+(?=(\s\())/g 		        //gets it from eg: 'Pixel Esports Club (Bo1)'
      const removeTeam1andVS = /(^.+?((\s\d\sv\s\d)|(\sv\s)))/g  //used to remove first part of regexm mathes eg: 'Infinity eSports v' on 'Infinity eSports v Pixel Esports Club (Bo1)'
			const sportNameRegx = /^.*?(?=(\-|\–|\—))/g					// ^.*?(?=\s(\-|\–|\—)  gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
			//TODO fix this error with this regex "ERROR: some error with finding the substring using /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g on [CSGO] WePlay! Forge of Masters – 16:00"
      const eventNameRegex = /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00' 
      const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const cleanDateRegex = /([A-Z]\w+(?=\s\d+(th|st|nd|rd)))|(?<=\d+)(th|st|nd|rd)/g //eg: matches 'Sunday' and 'th' on: 'Saturday 16th March 2019 22:00' 
      
      //remove the first part of the regex, it makes it easier to match the relevant section
      rawRowData.team2Name = rawRowData.team2Name.replace(this.getRegexSubstr(rawRowData.team1Name, removeTeam1andVS),'') 
      
      //does the parsing ad formattting of the date
      let rawDateString = `${extraData.date} ${this.getRegexSubstr(rawRowData.date, timeRegex)}` //puts all the info in a string
			rawDateString = rawDateString.replace(cleanDateRegex, '').trim()      //removes the day name and the 'th','nd' etc.. from the string
			let formattedDate: string
			if(date.isValid(rawDateString, 'D MMMM YYYY HH:mm')){
				const parsedDate:any = date.parse(rawDateString, 'D MMMM YYYY HH:mm')
				formattedDate = date.format(parsedDate,'YYYY-MM-DD HH:mm')
			} else throw 'Problem parsing the date'
			
			//format all the bets odds in the markets
			const parsedMarkets = rawRowData.markets.map((elem: RawMarketData):MarketData => {
				const parsedMarketData: MarketData = {
					...elem,
					bets: this.formatAllMarketOdds(elem.bets, uuid)
				}
				return parsedMarketData
			})
											
      return {
				uuid: uuid,
				parentMatchesdId: null,
				sportbookId: rawRowData.sportbookId,
        date: formattedDate,
        competitionName: this.getRegexSubstr(rawRowData.competitionName, eventNameRegex),
				sportName: this.standardiseSportName(this.getRegexSubstr(rawRowData.sportName, sportNameRegx)), 
				team1Name: this.getRegexSubstr(rawRowData.team1Name, team1regx),
				team2Name: this.getRegexSubstr(rawRowData.team2Name, team2regx),
				markets: parsedMarkets
      }
    }catch(err){
			this.saveError(this.errorTypes.NON_BLOCKING, err)
      return null
    }
  }
}

export default SkyBetCrawler