import fs from 'fs'
import request from 'request-promise-native'
//import fakeUA from 'fake-useragent';


//makes a request with a default user agent
export const fetchHtml = async (url: string) => {
	let allDom = ''
	await request({
		url: url,
		// @ts-ignore
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'}, (error: any, response: any, html:string) => {
		if(!error && response.statusCode && html !== null){
			allDom = html
		}
	})
	return allDom
}

//just a helper if you want to log out html for debugging purposes
export const logHtml = (html: string) => {
	const fileName = 'HtmlLog.html'
	fs.writeFile(fileName, html, function (err) {
		if (err) {
			return console.log(err);
		}

	});
}

//applies a regex to a string and throws an error if it fails in some way
export function applyRegex (string: string, regex: RegExp) {
	if (string === '') throw 'ERROR: the string we are ment to match with is blank';
    if (string.match(regex) !== null && string.match(regex)!.length === 1) {
        return string.match(regex)![0].trim()
    } else {
        throw `ERROR: some error with finding the substring using ${regex} on ${string}`;
    }
}



