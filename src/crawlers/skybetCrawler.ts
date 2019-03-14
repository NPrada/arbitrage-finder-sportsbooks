import cheerio from 'cheerio'
import isNil from 'lodash/isNil'
import BaseCrawler, { EventData } from './baseCrawler';
import {parseHrtimeToSeconds} from './resources/helpers'

type extraDataType = {date: string}

class SkyBetCrawler extends BaseCrawler {
  baseURL = 'https://m.skybet.com';

  run = async ():Promise<Array<EventData>> => {
    try{
      const startTime = process.hrtime()

      const baseUrlDom = await this.fetchHtml(`${this.baseURL}/esports`);
      const allMatchesPath = await this.getPathToAllMatchesByDay(baseUrlDom) 
      
      let allDom = await this.fetchHtml(`${this.baseURL}${allMatchesPath}`); //${baseURL}${allMatchesPath}
  
      const $ = cheerio.load(allDom);
      const allDayTables = $('ul.table-group', '#page-content').find('li')
  
      const matchDataList: Array<EventData> = []
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
      .find('tbody > tr').filter((index,elem) => { 	//flexible way of find the button that says: "All Matches By Day"
        const regex = /(?<!.)(all\s+matches\s+by\s+day)(?!.)/g
        return regex.test($(elem).find("b").text().trim().toLowerCase())
      })
      .find("[data-analytics='[Coupons]']")
      .attr('href')

      
    if (isNil(marketsListPath)) throw Error('Crawler was unable to get the link to the markets by day page')
    console.log(marketsListPath)
    return marketsListPath
  }

  getMatchDataFromDayTable = (tableHtml: string | null): Array<EventData> => {

    if (isNil(tableHtml) || tableHtml === '')
      throw Error('getMatchDataFromDayTable got no table html to work with')

    const $ = cheerio.load(tableHtml);

    const data: Array<EventData> = []
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
  
  parseRawData = (rawRowData: EventData, extraData: extraDataType): EventData | null => {
    try{
      if (!rawRowData.sportName) throw 'No raw sport name was found'   	//TODO throw an error and log it
      if (!rawRowData.date) throw 'No raw date info was found'        	//TODO throw an error and log it
      if (!rawRowData.eventName) throw 'No raw event name was found'   	//TODO throw an error and log it
      if (!rawRowData.team1 || !rawRowData.team2) throw 'No team data was found'
      if (!rawRowData.team1.name || !rawRowData.team2.name) throw 'No raw team name was found'
      if (!rawRowData.team1.odds || !rawRowData.team2.odds) throw 'No raw team odds were found'
      if (rawRowData.error) throw rawRowData.error

      const team1regx = /.+(?=\sv\s)/g;							//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
      const team2regx = /(?<=v ).+(?=(\s\())/g; 		//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
      const sportNameRegx = /.+(?=\s*[\-\–\—]\s*.*\s*[\-\–\—])/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const eventNameRegex = /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
      
      return {
        ...rawRowData,
        date: this.getRegexSubstr(rawRowData.date, timeRegex) + ' ' + extraData.date,
        eventName: this.getRegexSubstr(rawRowData.eventName, eventNameRegex),
        sportName: this.standardiseSportName(this.getRegexSubstr(rawRowData.sportName, sportNameRegx)), 
        team1: {...rawRowData.team1, name: this.getRegexSubstr(rawRowData.team1.name, team1regx)},
        team2: {...rawRowData.team2, name: this.getRegexSubstr(rawRowData.team2.name, team2regx)},
      }
    }catch(e){
      //TODO throw an error and log it
      console.log('Non Blocking Error:',e)
      return null
    }
  }
}

export default SkyBetCrawler