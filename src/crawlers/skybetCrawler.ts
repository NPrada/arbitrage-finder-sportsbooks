import cheerio from 'cheerio'
import request from 'request-promise-native'

interface EventData {
	eventName: string | null
	sportName: string | null
	pageHref: string | null
	team1: string | null
	team2: string | null
	error?: string | null
}

module.exports = {
	run: async () => {

		// const browser = await puppeteer.launch({ headless: true});
		// const page = await browser.newPage();
		// page.setViewport({width: 1700, height: 1300});
		//get the entire dom as text
		// let allDom = await page.evaluate((sel) => {
		// 	let element = document.querySelector(sel);
		// 	return element ? element.innerHTML : null;
		// }, "body");


		const baseURL = 'https://m.skybet.com/';
		let allDom = null;


		await request({
			url:`${baseURL}/esports`,
			// @ts-ignore
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'}, (error: any, response: any, html:string) => {
			if(!error && response.statusCode){
					console.log('done')
					allDom = html
			}
		})

		if(allDom === null) throw Error('ERROR: failed to find dom'); //TODO might not be needed
		const $ = cheerio.load(allDom);
		const eventDataSelector = ' #page-content > .table-group > [data-ui-state=esportsfeatured] ';
		const matchDataSelector = '.accordion--generic > table > tbody';
		const data: Array<EventData> = [];

		$(eventDataSelector).children().each((i: number, elem: CheerioElement) => { //gets the events

			$(elem).find(matchDataSelector).children().each((i: number,elem: CheerioElement) => { 	//gets the matches
				let eventInfo: EventData = {
					eventName: null,
					sportName: null,
					pageHref: null,
					team1: null,
					team2: null,
				};

				const team1regx = /.+(?=\sv\s)/g;					//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const team2regx = /(?<=v ).+(?=(\s\())/g; //gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const eventNameRegx = /(?<=- ).+/g;  			//gets it from eg: 'LOL - Liga Latinoamerica
				const sportNameRegx = /.+(?=\s-\s)/g; 		//gets it from eg: 'LOL - Liga Latinoamerica
				// /(?<=v ).+(?=(\s\(Bo\d\)))/g; csgo specific regex

				eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')

				const fullEventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
				const teamsString = $(elem).find('tr > .cell--link > a').text().trim();
				try{
					eventInfo.eventName = applyRegex(fullEventName, eventNameRegx);	//get the event name
					eventInfo.sportName = applyRegex(fullEventName, sportNameRegx); //get the sport name
					eventInfo.team1 = applyRegex(teamsString,team1regx);						// get the team1 name
					eventInfo.team2 = applyRegex(teamsString,team2regx);						//get the team2 name
				} catch (e) {
					eventInfo.error = e;
				}


				function applyRegex (string: string, regex: RegExp) {

					if (string.match(regex) !== null && string.match(regex)!.length === 1) {
						return string.match(regex)![0].trim()
					} else {
						throw `ERROR: some error with finding team2s name using ${team2regx} from ${teamsString}`;
					}

				}

				data.push(eventInfo)
			});
		});


		if(data.length === 0){
			console.log(allDom);
			console.log('There was some error we didnt get any data')
		}
		console.log(data);
		return data
	},
};
