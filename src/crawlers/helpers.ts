import fs from 'fs'
import request from 'request-promise-native'


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

//just a helper if you want to log out html for debugging purpuses
export const logHtml = (html: string) => {
	const fileName = 'HtmlLog.html'
	fs.writeFile(fileName, html, function (err) {
		if (err) {
			return console.log(err);
		}

	});
}



