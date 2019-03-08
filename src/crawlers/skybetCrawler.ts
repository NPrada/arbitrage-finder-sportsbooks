import puppeteer from 'puppeteer'
import cheerio from 'cheerio'

interface EventData {
	eventName: string | null
	pageHref: string | null
	team1: string | null
	team2: string | null
	error?: string | null
}

module.exports = {
	run: async () => {

		const browser = await puppeteer.launch({ headless: true});
		const page = await browser.newPage();
		await page.setViewport({width: 1700, height: 1300});

		const baseURL = 'https://m.skybet.com/';
		await page.goto(`${baseURL}/esports`);

		//get the entire dom as text
		let allDom = await page.evaluate((sel: string) => {
			let element = document.querySelector(sel);
			//return element ? element.innerHTML : null;
			return element ? element.innerHTML : null;
		}, "body");

		if(allDom === null) throw Error('ERROR: failed to find dom');

		const $ = cheerio.load(allDom);

		const eventDataSelector = ' #page-content > .table-group > [data-ui-state=esportsfeatured] ';
		const matchDataSelector = '.accordion--generic > table > tbody';
		const data: Array<EventData> = [];

		$(eventDataSelector).children().each((i: number, elem: CheerioElement) => { //gets the events

			$(elem).find(matchDataSelector).children().each((i: number,elem: CheerioElement) => { 	//gets the matches
				let eventInfo: EventData = {
					eventName: null,
					pageHref: null,
					team1: null,
					team2: null,
				};

				const team1regx = /.+(?=\sv\s)/g;
				const team2regx = /(?<=v ).+(?=(\s\(Bo\d\)))/g;

				eventInfo.eventName = $(elem).find('tr > .cell--link > a').attr('data-analytics');
				eventInfo.pageHref = baseURL + $(elem).find('tr > .cell--link > a').attr('href')

				const teamsString = $(elem).find('tr > .cell--link > a').text().trim();

				if (teamsString.match(team1regx) !== null && teamsString.match(team1regx)!.length === 1) {
					eventInfo.team1 = teamsString.match(team1regx)![0].trim()
				} else {
					console.error(`ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`);
					eventInfo.error = `ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`
				}

				if (teamsString.match(team2regx) !== null &&teamsString.match(team2regx)!.length === 1) {
					eventInfo.team2 = teamsString.match(team2regx)![0].trim()
				} else {
					console.error(`ERROR: some error with finding team2s name using ${team2regx} from ${teamsString}`);
					eventInfo.error = `ERROR: some error with finding team1s name using ${team1regx} from ${teamsString}`
				}

				data.push(eventInfo)
			});

		});

		await browser.close();
		console.log(data);
		return data
	},
};
