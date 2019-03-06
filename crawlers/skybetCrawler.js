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
				let eventInfo = {}

				const team1regx = /.+(?=\s\sv\s\s)/g;
				const team2regx = /(?<=v ).+(?=(\s\())/g;

				eventInfo.eventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
				eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')

				const teamsString = $(elem).find('tr > .cell--link > a').text().trim();
				if(teamsString.match(team1regx).length === 1){
					eventInfo.team1 = teamsString.match(team1regx)[0].trim()
				}
				if(teamsString.match(team2regx).length === 1){
					eventInfo.team2 = teamsString.match(team2regx)[0].trim()
				}

				data.push(eventInfo)
			});

		});

		await browser.close();
		console.log(data);
		return data
	},
};
