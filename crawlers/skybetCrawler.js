const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

module.exports = {
	run: async () => {

		const browser = await puppeteer.launch({ headless: false});
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

				const team1regx = /.+(?=\sv\s)/g;
				const team2regx = /(?<=v ).+(?=(\s\(Bo\d\)))/g;

				eventInfo.eventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
				eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')

				const teamsString = $(elem).find('tr > .cell--link > a').text().trim();

				if (teamsString.match(team1regx) !== null && teamsString.match(team1regx).length === 1) {
					eventInfo.team1 = teamsString.match(team1regx)[0].trim()
				} else {
					console.error(`ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`);
					eventInfo.error = `ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`
				}

				if (teamsString.match(team2regx) !== null &&teamsString.match(team2regx).length === 1) {
					eventInfo.team2 = teamsString.match(team2regx)[0].trim()
				} else {
					console.error(`ERROR: some error with finding team2s name using ${team2regx} from ${teamsString}`);
					eventInfo.error = `ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`
				}

				data.push(eventInfo)
			});

		});

		await browser.close();
		//console.log(data);
		return data
	},
};
