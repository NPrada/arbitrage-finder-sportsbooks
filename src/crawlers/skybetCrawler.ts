import cheerio from 'cheerio'
import isNil from 'lodash/isNil'
import {fetchHtml, logHtml} from './helpers';

//this is the schema that this file will output for each match

interface EventData {
	eventName: string | null
	sportName: string | null
	date: string | null
	team1: {name: string | null, odds: string | null}
	team2:  {name: string | null, odds: string | null}
	matchType?: string | null
	pageHref?: string | null
	error?: string | null
}

const baseURL = 'https://m.skybet.com/';


export const getAllMatchesByDayPath =  async (alldom: string | null) => {

	if (isNil(alldom) || alldom === '')
		throw Error ('getAllMatchesByDayPath got no table html to work with')

	const $ = cheerio.load(alldom);

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

function applyRegex (string: string, regex: RegExp) {

	if (string.match(regex) !== null && string.match(regex)!.length === 1) {
		return string.match(regex)![0].trim()
	} else {
	throw `ERROR: some error with finding the substring using ${regex} on ${string}`;
	}
}

export const getMatchDataFromDayTable = (tableHtml: string | null): Array<EventData> => {

	if (isNil(tableHtml) || tableHtml === '')
		throw Error ('getMatchDataFromDayTable got no table html to work with')

	const data: Array<EventData> = []
	let rowElem: Cheerio
	const team1regx = /.+(?=\sv\s)/g;							//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
	const team2regx = /(?<=v ).+(?=(\s\())/g; 		//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
	const sportNameRegx = /.+(?=\s*[\-\–]\s*)/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
	const eventNameRegex = /(?<=[\-\–]\s*)(.*)(?=\s*[\–\-].*)/g 	//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'
	const timeRegex = /\d\d:\d\d/g					//gets it from eg: 'R6 - Rainbow 6 Pro League Europe – 18:00'


	const $ = cheerio.load(tableHtml);
	let currHeaderText: string = ''

	const date = $('h2 > span').text()
	const tableRows = $('tbody > tr')
	for(let i = 0; i < tableRows.length; i++){
		const matchData: EventData = {
			eventName: null,
			sportName: null,
			date: null,
			team1: {name: null, odds: null},
			team2: {name: null, odds: null}
		}



		rowElem = tableRows.eq(i)
		const findHeaderText = rowElem.find('td.group-header').text(); //eg: LOL - LEC – 21:10

		if(findHeaderText !== ''){
			currHeaderText = findHeaderText.trim()
		}else {
			try{
				const matchNameString = rowElem.find('a[href] > b').text()
				const matchHref = rowElem.find('a[href]').attr('href')

				//TODO add a check if the outcome is suspended
				const odds1 = rowElem.not('.outcome--is-suspended')
					.find('.cell--price')
					.find('.js-oc-price')
					.first().text().trim()

				const odds2 = rowElem.not('.outcome--is-suspended')
					.find('.cell--price')
					.find('.js-oc-price')
					.last().text().trim()

				if (odds1 == ''|| odds2 == '') throw 'Error: could not find some odds'
				if (matchHref === '') throw 'Error: could not find the match link'
				if (matchNameString === '') throw 'Error: could not find the match name'


				matchData.date = applyRegex(currHeaderText, timeRegex) + date;
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
	console.log(data)
	return data;
}

const run = async () => {




	//const baseUrlDom = await fetchHtml(`${baseURL}/esports`);
	//const allMatchesPath = await getAllMatchesByDayPath(baseUrlDom)


	let allDom = await fetchHtml(`https://m.skybet.com/esports/coupon/10011234`); //${baseURL}${allMatchesPath}

	const $ = cheerio.load(allDom);
	const allDayTables = $('ul.table-group','#page-content').find('li')
	const matchDataList: Array<EventData> = []
	for (let i = 0; i < allDayTables.length; i++){

		matchDataList.concat(getMatchDataFromDayTable(allDayTables.eq(i).html()))
	}
	console.log(matchDataList)


	//allDom = await fetchHtml(`${baseURL}${marketsListPath}`);

	//check you you indeed are on the page with all the matches by day












	// $(eventDataSelector).children().each((i: number, elem: CheerioElement) => { //gets the events
	//
	// 	$(elem).find(matchDataSelector).children().each((i: number,elem: CheerioElement) => { 	//gets the matches
	// 		let eventInfo: EventData = {
	// 			eventName: null,
	// 			sportName: null,
	// 			pageHref: null,
	// 			team1: null,
	// 			team2: null,
	// 		};
	//
	//
	// 		const eventNameRegx = /(?<=- ).+/g;  			//gets it from eg: 'LOL - Liga Latinoamerica
	// 		const sportNameRegx = /.+(?=\s-\s)/g; 		//gets it from eg: 'LOL - Liga Latinoamerica
	// 		// /(?<=v ).+(?=(\s\(Bo\d\)))/g; csgo specific regex
	//
	// 		eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')
	//
	// 		const fullEventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
	// 		const teamsString = $(elem).find('tr > .cell--link > a').text().trim();
	// 		try{
	// 			eventInfo.eventName = applyRegex(fullEventName, eventNameRegx);	//get the event name
	// 			eventInfo.sportName = applyRegex(fullEventName, sportNameRegx); //get the sport name
	// 			eventInfo.team1 = applyRegex(teamsString,team1regx);						// get the team1 name
	// 			eventInfo.team2 = applyRegex(teamsString,team2regx);						//get the team2 name
	// 		} catch (e) {
	// 			eventInfo.error = e;
	// 		}
	//
	//
	//
	//
	// 		data.push(eventInfo)
	// 	});
	// });


	// if(data.length === 0){
	// 	console.log($('body'))
	// 	console.log('There was some error we didnt get any data')
	// }
	// console.log(data);
	//return data
}

export default run