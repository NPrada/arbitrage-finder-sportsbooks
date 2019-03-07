const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

module.exports = {
	run: async () => {

		const browser = await puppeteer.launch({ headless: true});
		const page = await browser.newPage();
		page.setViewport({width: 1700, height: 1300});

		const baseURL = 'https://m.skybet.com/';
		await page.goto(`${baseURL}/esports`);

		//get the entire dom as text
		let allDom = await page.evaluate((sel) => {
			let element = document.querySelector(sel);
			return element ? element.innerHTML : null;
		}, "body");

		const $ = cheerio.load(allDom)
		const eventDataSelector = ' #page-content > .table-group > [data-ui-state=esportsfeatured] ';
		const matchDataSelector = '.accordion--generic > table > tbody';
		const data = [];

		$(eventDataSelector).children().each((i, elem) => { //gets the events

			$(elem).find(matchDataSelector).children().each((i,elem) => { 	//gets the matches
				let eventInfo = {};

				const team1regx = /.+(?=\sv\s)/g;					//gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const team2regx = /(?<=v ).+(?=(\s\())/g; //gets it from eg: 'Infinity eSports v Pixel Esports Club (Bo1)'
				const eventNameRegx = /(?<=- ).+/g;  			//gets it from eg: 'LOL - Liga Latinoamerica
				const sportNameRegx = /.+(?=\s-\s)/g; 		//gets it from eg: 'LOL - Liga Latinoamerica
				// /(?<=v ).+(?=(\s\(Bo\d\)))/g; csgo specific regex

				eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')

				const fullEventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
				const teamsString = $(elem).find('tr > .cell--link > a').text().trim();
				try{
					eventInfo.eventName = applyRegex(fullEventName, eventNameRegx);//get the event name
					eventInfo.sportName = applyRegex(fullEventName, sportNameRegx); //get the sport name
					eventInfo.team1 = applyRegex(teamsString,team1regx);			// get the team1 name
					eventInfo.team2 = applyRegex(teamsString,team2regx);			//get the team2 name
				} catch (e) {
					eventInfo.error = e;
				}


				function applyRegex (string,regex){
					if (string.match(regex) !== null && string.match(regex).length === 1) {
						return string.match(regex)[0].trim()
					} else {
						throw `ERROR: some error with finding team2s name using ${team2regx} from ${teamsString}`;
					}

				}

				data.push(eventInfo)
			});
		});

		await browser.close();

		if(data.length === 0){
			console.log(allDom);
			console.log('There was some error we didnt get any data')
		}
		console.log(data);
		return data
	},
};
