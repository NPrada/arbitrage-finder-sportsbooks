import cheerio from 'cheerio'
import isNil from 'lodash/isNil'
import BaseCrawler, { EventData } from './baseCrawler';
import {parseHrtimeToSeconds} from './resources/helpers'

type extraDataType = {date: string}

class SkyBetCrawler extends BaseCrawler {
	baseURL = 'https://m.skybet.com';

	run = async ():Promise<Array<EventData>> => {
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
	
		//TODO add better error checking, eg: we didnt find the correct All Matches By Day
		if (isNil(marketsListPath)) throw Error('Crawler was unable to get the link to the markets by day page')

		return marketsListPath
	}

	getMatchDataFromDayTable = (tableHtml: string | null): Array<EventData> => {

		if (isNil(tableHtml) || tableHtml === '')
			throw Error('getMatchDataFromDayTable got no table html to work with')

		const data: Array<EventData> = []
		let rowElem: Cheerio

		const $ = cheerio.load(tableHtml);
		let currHeaderText: string = ''

		const date = $('h2 > span').text()
		const tableRows = $('tbody > tr')
		for (let i = 0; i < tableRows.length; i++) {
			const rawMatchData = this.initializeEventData()

			//go through the rows on by one
			rowElem = tableRows.eq(i)
			const findHeaderText = rowElem.find('td.group-header').text().trim(); //eg: LOL - LEC – 21:10
      
			if (findHeaderText !== '') {
				currHeaderText = findHeaderText //update the Header text that is being used,
			} else {
				try {
					const matchNameString = rowElem.find('a[href] > b').text()
					const matchHref = rowElem.find('a[href]').attr('href')
          //TODO confirm it does not find suspended outcomes
          //TODO check that there isnt a tie option 
					const odds1 = rowElem.not('.outcome--is-suspended')
						.find('.cell--price')
						.find('.js-oc-price')
						.first().text().trim()

					const odds2 = rowElem.not('.outcome--is-suspended')
						.find('.cell--price')
						.find('.js-oc-price')
						.last().text().trim()
          
					if (matchNameString === '') throw 'Error: could not find the match name'
					if (matchHref === '') throw 'Error: could not find the match link'
					if (odds1 == '' || odds2 == '') throw 'Error: could not find some odds'
          
					rawMatchData.date = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
					rawMatchData.eventName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
					rawMatchData.sportName = currHeaderText //'R6 - Rainbow 6 Pro League Europe – 18:00'
					rawMatchData.pageHref = this.baseURL + matchHref
					rawMatchData.team1.odds = odds1
					rawMatchData.team2.odds = odds2
					rawMatchData.team1.name = matchNameString //'Infinity eSports v Pixel Esports Club (Bo1)'
					rawMatchData.team2.name = matchNameString //'Infinity eSports v Pixel Esports Club (Bo1)'
          
        
				} catch (e) {
					console.log(e)
					rawMatchData.error = e
        }
        
        const parsedRowData = this.parseRawData(rawMatchData, {date: date})
        
        if(parsedRowData !== null) data.push(parsedRowData)
			}
    }
		return data;
  }
  
  parseRawData = (rawRowData: EventData, extraData: extraDataType): EventData | null => {

    if (!rawRowData.sportName) return null   	//TODO throw an error and log it
    if (!rawRowData.date) return null        	//TODO throw an error and log it
    if (!rawRowData.eventName) return null   	//TODO throw an error and log it
    if (!rawRowData.team1 || !rawRowData.team2) return null
    if (!rawRowData.team1.name || !rawRowData.team2.name) return null
    if (!rawRowData.team1.odds || !rawRowData.team2.odds) return null
		if (rawRowData.error) return null

    //const parsedRowData = this.initializeEventData()
    const team1regx = /.+(?=\sv\s)/g;							//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
    const team2regx = /(?<=v ).+(?=(\s\())/g; 		//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
    const sportNameRegx = /.+(?=\s*[\-\–\—]\s*.*\s*[\-\–\—])/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
    const eventNameRegex = /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
    const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
    
    try{
       return {
        ...rawRowData,
        date: this.applyRegex(rawRowData.date, timeRegex) + ' ' + extraData.date,
        eventName: this.applyRegex(rawRowData.eventName, eventNameRegex),
        sportName: this.standardiseSportName(this.applyRegex(rawRowData.sportName, sportNameRegx)), 
        team1: {...rawRowData.team1, name: this.applyRegex(rawRowData.team1.name, team1regx)},
        team2: {...rawRowData.team2, name: this.applyRegex(rawRowData.team2.name, team2regx)},
      }
    }catch(e){
      //TODO throw an error and log it
      console.log(e)
      return null
    }
  }
}

export default SkyBetCrawler