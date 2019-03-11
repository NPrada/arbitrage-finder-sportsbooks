import cheerio from 'cheerio'
import isNil from 'lodash/isNil'
import {fetchHtml, logHtml, applyRegex} from './helpers/helpers';
import {EventData} from '../types'
//this is the schema that this file will output for each match



const baseURL = 'https://m.skybet.com';
const sportBookId = 'skybet';


const runSkyBetCrawler = async () => {


    const baseUrlDom = await fetchHtml(`${baseURL}/esports`);
    const allMatchesPath = await getPathToAllMatchesByDay(baseUrlDom)

    let allDom = await fetchHtml(`${baseURL}${allMatchesPath}`); //${baseURL}${allMatchesPath}

    const $ = cheerio.load(allDom);
    const allDayTables = $('ul.table-group','#page-content').find('li')
   
	const matchDataList: Array<EventData> = []
    for (let i = 0; i < allDayTables.length; i++){
        matchDataList.push(...getMatchDataFromDayTable(allDayTables.eq(i).html()))
    }
    return matchDataList;
}

export default runSkyBetCrawler


export const getPathToAllMatchesByDay =  async (allDom: string | null) => {

	if (isNil(allDom) || allDom === '')
		throw Error ('getAllMatchesByDayPath got no table html to work with')

	const $ = cheerio.load(allDom);
	//TODO improvement check you found the correct Acummulators button by doin toLowercase eg
	const marketsListPath = $('span:contains("Accumulators")','#page-content')
		.closest('li')
		.find("[data-analytics='[Coupons]'] ")
		.find('b:contains("All Matches By Day")') //check you found the correct link
		.parent()
		.attr('href')

	//TODO add better error checking
	if(isNil(marketsListPath)) throw Error ('Crawler was unable to get the link to the markets by day page')

	return marketsListPath
}


export const getMatchDataFromDayTable = (tableHtml: string | null): Array<EventData> => {

	if (isNil(tableHtml) || tableHtml === '')
		throw Error ('getMatchDataFromDayTable got no table html to work with')

	const data: Array<EventData> = []
	let rowElem: Cheerio

	const $ = cheerio.load(tableHtml);
	let currHeaderText: string = ''

	const date = $('h2 > span').text()
	const tableRows = $('tbody > tr')
	for(let i = 0; i < tableRows.length; i++){
		const matchData: EventData = {
			sportbookId: sportBookId,
			eventName: null,
			sportName: null,
			date: null,
			team1: {name: null, odds: null},
			team2: {name: null, odds: null}
		}

		//go through the rows on by one
		rowElem = tableRows.eq(i)
		const findHeaderText = rowElem.find('td.group-header').text(); //eg: LOL - LEC – 21:10

		if(findHeaderText !== ''){
			currHeaderText = findHeaderText.trim() //update the Header text that is being used
		}else {
			try{
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

				if (matchNameString === '') throw 'Error: could not find the match name'
				if (matchHref === '') throw 'Error: could not find the match link'
				if (odds1 == ''|| odds2 == '') throw 'Error: could not find some odds'


				const team1regx = /.+(?=\sv\s)/g;							//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const team2regx = /(?<=v ).+(?=(\s\())/g; 		//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const sportNameRegx = /.+(?=\s*[\-\–\—]\s*.*\s*[\-\–\—])/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
				const eventNameRegex = /(?<=[\-\–\—]\s*)(.*)(?=\s*[\–\-\—].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
				const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'

				matchData.date = applyRegex(currHeaderText, timeRegex) + ' ' +date;
				matchData.eventName = applyRegex(currHeaderText, eventNameRegex)
				matchData.sportName = applyRegex(currHeaderText, sportNameRegx)
				matchData.pageHref = baseURL + matchHref
				matchData.team1.odds = odds1
				matchData.team2.odds = odds2
				matchData.team1.name = applyRegex(matchNameString, team1regx)
				matchData.team2.name = applyRegex(matchNameString, team2regx)

			}catch (e) {
				console.log(e)
				matchData.error = e
			}

			data.push(matchData)
		}
	}
	return data;
}
