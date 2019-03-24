import cheerio from 'cheerio'
import date from 'date-and-time'
import isNil from 'lodash/isNil'
import BaseCrawler, { RawGameData ,ParsedGameData } from './baseCrawler';
import {parseHrtimeToSeconds, getRandomArbitrary} from './resources/helpers'
import uniqid from 'uniqid'

type extraDataType = {date: string}
//TODO 
class SkyBetCrawler extends BaseCrawler {
  baseURL = 'https://m.skybet.com';

  run = async ():Promise<Array<ParsedGameData>> => {
    try{
      const startTime = process.hrtime()

      const baseUrlDom = await this.fetchHtml(`${this.baseURL}/esports`);
			const allMatchesPath = await this.getPathToAllMatchesByDay(baseUrlDom) 

			//just wait random time before fetching the next page to thow off that we are a bot
			await this.sleep(getRandomArbitrary(3,15)*1000)  //waits between 3-15s
			
      let allDom = await this.fetchHtml(`${this.baseURL}${allMatchesPath}`); //${baseURL}${allMatchesPath}
  
      const $ = cheerio.load(allDom);
      const allDayTables = $('ul.table-group', '#page-content').find('li')
  
      const matchDataList: Array<ParsedGameData> = []
      for (let i = 0; i < allDayTables.length; i++) {
        matchDataList.push(...this.getMatchDataFromDayTable(allDayTables.eq(i).html()))
      }
  
      const elapsedTime = parseHrtimeToSeconds(process.hrtime(startTime))
      console.log(`skybet crawler finished in ${elapsedTime}s, and it fetched ${matchDataList.length} matches`)
			return matchDataList;
    }catch(err){
      console.log('BLOCKING ERROR')
      console.log(err)
      return []
    }
  }

  getPathToAllMatchesByDay = async (allDom: string | null): Promise<string> => {

    if (isNil(allDom) || allDom === '')
      throw Error('getAllMatchesByDayPath got no table html to work with')

    const $ = cheerio.load(allDom);
    
    const marketsListPath = $('span:contains("Accumulators")', '#page-content')
      .closest('li') 									//goes back up to the whole accordion container
      .find('tbody > tr').filter((_index,elem) => { 	//flexible way of find the button that says: "All Matches By Day"
				return ($(elem).find("b").text()
									.trim()
									.toLowerCase()
									.split(' ')
									.join('')
									.indexOf("allmatchesbyday") !== -1)
      })
      .find("[data-analytics='[Coupons]']")
      .attr('href')

      
    if (isNil(marketsListPath)) throw Error('Crawler was unable to get the link to the markets by day page')
  
    return marketsListPath
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
        rawMatchData.eventName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
        rawMatchData.sportName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
        rawMatchData.pageHref = this.baseURL + matchHref
        rawMatchData.team1.odds = odds1
        rawMatchData.team2.odds = odds2
        rawMatchData.team1.name = matchNameString //'Infinity eSports v Pixel Esports Club (Bo1)'
        rawMatchData.team2.name = matchNameString //'Infinity eSports v Pixel Esports Club (Bo1)'
          
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
      
      const team1regx = /(^.+?((?=\s\d\sv\s)|(?=\sv\s)))/g			//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
      const team2regx = /.+(?=(\s\())/g 		        //gets it from eg: 'Pixel Esports Club (Bo1)'
      const removeTeam1andVS = /(^.+?((\s\d\sv\s\d)|(\sv\s)))/g  //used to remove first part of regexm mathes eg: 'Infinity eSports v' on 'Infinity eSports v Pixel Esports Club (Bo1)'
      const sportNameRegx = /^.*?(?=(\-|\–|\—))/g					// ^.*?(?=\s(\-|\–|\—)  gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const eventNameRegex = /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const cleanDateRegex = /([A-Z]\w+(?=\s\d+(th|st|nd|rd)))|(?<=\d+)(th|st|nd|rd)/g //eg: matches 'Sunday' and 'th' on: 'Saturday 16th March 2019 22:00' 
      
      //remove the first part of the regex, it makes it easier to match the relevant section
      rawRowData.team2.name = rawRowData.team2.name.replace(this.getRegexSubstr(rawRowData.team1.name, removeTeam1andVS),'') 
      
      //does the parsing ad formattting of the date
      let rawDateString = `${extraData.date} ${this.getRegexSubstr(rawRowData.date, timeRegex)}` //puts all the info in a string
			rawDateString = rawDateString.replace(cleanDateRegex, '').trim()      //removes the day name and the 'th','nd' etc.. from the string
			let formattedDate: string
			if(date.isValid(rawDateString, 'D MMMM YYYY HH:mm')){
				const parsedDate:any = date.parse(rawDateString, 'D MMMM YYYY HH:mm')
				formattedDate = date.format(parsedDate,'YYYY-MM-DD HH:mm')
			} else throw 'Problem parsing the date'
      
      return {
				uuid: uniqid(),
				sportbookId: rawRowData.sportbookId,
        date: formattedDate,
        competitionName: this.getRegexSubstr(rawRowData.eventName, eventNameRegex),
        sportName: this.standardiseSportName(this.getRegexSubstr(rawRowData.sportName, sportNameRegx)), 
				team1: {
					name: this.getRegexSubstr(rawRowData.team1.name, team1regx), 
					odds: this.formatOdds(rawRowData.team1.odds) },
				team2: {
					name: this.getRegexSubstr(rawRowData.team2.name, team2regx), 
					odds: this.formatOdds(rawRowData.team2.odds)},
      }
    }catch(e){
      
      console.log('(sky) Non Blocking Error:',e)
      return null
    }
  }
}

export default SkyBetCrawler