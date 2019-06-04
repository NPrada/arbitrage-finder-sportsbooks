import fs from 'fs'
import {Page} from 'puppeteer'
import {MarketNames} from '../baseCrawler'

//just a helper if you want to log out html to a file for debugging purposes
export const logHtml = (html: string | null | undefined) => {
  const fileName = 'HtmlLog.html'
  fs.writeFile('debugging/'+fileName, html, function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

/**
 * saves json object into file of your naming
 * @param json 
 * @param fileName 
 */
export const logJson = (json: object | null | undefined, fileName:string) => {
   fs.writeFile('debugging/'+fileName+'.json', JSON.stringify(json), function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

/**
 * Gets Json object from a .json file saved somewhare
 * @param path path to json file
 */
export function getJsonFromFile (path: string): Object{
	return JSON.parse(fs.readFileSync(path+'.json').toString());
}

/**
 * converts hrtime into seconds 
 * @param hrtime 
 */
export function parseHrtimeToSeconds(hrtime: Array<number>) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
}

//finds the market data out of the array of markets available
export function findMarketObject (marketName: MarketNames, marketsArr: Array<any>) {
	return marketsArr.find( (elem: any): boolean => {
		return elem.marketName === marketName
	});
}

/**
 * https://github.com/GoogleChrome/puppeteer/issues/1353
 * configurable function used to wait untill the network is idle
 * 
 * @param page 
 * @param timeout 
 * @param maxInflightRequests 
 */
export function waitForNetworkIdle(page:Page, timeout:number, maxInflightRequests:number = 0) {
	page.on('request', onRequestStarted);
	page.on('requestfinished', onRequestFinished);
	page.on('requestfailed', onRequestFinished);

	let inflight = 0;
	let fulfill:any;
	let promise = new Promise(x => fulfill = x);
	let timeoutId = setTimeout(onTimeoutDone, timeout);
	return promise;

	function onTimeoutDone() {
		page.removeListener('request', onRequestStarted);
		page.removeListener('requestfinished', onRequestFinished);
		page.removeListener('requestfailed', onRequestFinished);
		fulfill();
	}

	function onRequestStarted() {
		++inflight;
		if (inflight > maxInflightRequests)
			clearTimeout(timeoutId);
	}
	
	function onRequestFinished() {
		if (inflight === 0)
			return;
		--inflight;
		if (inflight === maxInflightRequests)
			timeoutId = setTimeout(onTimeoutDone, timeout);
	}
}