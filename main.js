//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator
//https://developers.google.com/web/tools/puppeteer/get-started

//getting the odds margin to see if its profitable
// [1/(odds of event 1) + 1/(odds of event 2)} x 100
function getProfitMargin (ev1,ev2, stake){
    const marginPercent =  ( ( (1/ev1) + (1/ev2) ) * 100);
    const stake1 = stake;
    const stake2 = (stake1 * ev1) / ev2;
    const totStake = stake1 + stake2;
    const returnOnInvestment = ((( (stake1 * ev1) - totStake) / totStake )  *100 )
    return {
        arb1: marginPercent +'%', // indicates what portion your investment will take up of the total winnings.
        returnOnInvestment: returnOnInvestment+'%',
        totStake: totStake,
        profit: (stake1 * ev1) - totStake,
        bet1: {odd: ev1, stake: stake1},
        bet2: {odd: ev2, stake: stake2}
    }
}

// console.log( getProfitMargin(1.25, 4, 10 ));


const puppeteer = require('puppeteer');

(async () => {

	const browser = await puppeteer.launch({ headless: false});
	const page = await browser.newPage();
	page.setViewport({width: 1700, height: 1300});
	await page.goto('https://m.skybet.com/esports');
	await page.screenshot({path: 'example.png'});


	const csgoSelector = '.flex-layout__wrapper > .sbp__flex-layout > .sbp__main > #js-content > #js-inner-content > ' +
		'.main__content > .outer-page-content > #page-content > .table-group > [data-ui-state=esportsfeatured] > ' +
		'.accordion--generic > h2 > span';


	const getTitle = '#page-content > .class-title > .class-title__text';
	// const text = await page.evaluate((getTitle) => document.querySelector(getTitle).innerText);
	//console.log(text)

	let title = await page.evaluate((sel) => {
		let element = document.querySelector(sel);
		return element ? element.innerHTML : null;
	}, csgoSelector);

	console.log(title)

	// const searchValue = await page.$eval(getTitle, el => el.value);
	//console.log(searchValue)
	await browser.close();
})();
