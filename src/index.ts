//https://www.pinnacle.com/en/betting-resources/betting-tools/margin-calculator
//https://www.pinnacle.com/en/betting-resources/betting-tools/arbitrage-calculator
//https://developers.google.com/web/tools/puppeteer/get-started
//https://molily.de/robust-javascript/#web-crawlers-without-javascript-support

//getting the odds margin to see if its profitable
// [1/(odds of event 1) + 1/(odds of event 2)} x 100
function getProfitMargin (ev1: number,ev2: number, stake: number){
    const marginPercent =  ( ( (1/ev1) + (1/ev2) ) * 100);
    const stake1 = stake;
    const stake2 = (stake1 * ev1) / ev2;
    const totStake = stake1 + stake2;
    const returnOnInvestment = ((( (stake1 * ev1) - totStake) / totStake )  * 100 )
    return {
        arb1: marginPercent +'%', // indicates what portion your investment will take up the total winnings.
        returnOnInvestment: returnOnInvestment+'%',
        totStake: totStake,
        profit: (stake1 * ev1) - totStake,
        bet1: {odd: ev1, stake: stake1},
        bet2: {odd: ev2, stake: stake2}
    }
}

import runSkyBetCrawler from './crawlers/skybetCrawler'
const skyData = runSkyBetCrawler();
