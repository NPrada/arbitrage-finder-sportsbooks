import request from 'request-promise-native'
import { UAs } from './resources/useragentList'

export interface EventData {
	sportbookId: string
	eventName: string | null
	sportName: string | null
	date: string | null
	team1: { name: string | null, odds: string | null }
	team2: { name: string | null, odds: string | null }
	matchType?: string | null
	pageHref?: string | null
	error?: string | null
}


export default class BaseCrawler {

	sportBookId: string
	constructor(sportBookId: string, ) {
		this.sportBookId = sportBookId
	}

	initializeEventData = (): EventData => {
		return {
			sportbookId: this.sportBookId,
			eventName: null,
			sportName: null,
			date: null,
			team1: { name: null, odds: null },
			team2: { name: null, odds: null }
		}
	}

	fakeUA = (): string => {
		return UAs[Math.floor(Math.random() * UAs.length)]
	}

	//makes a request
	fetchHtml = async (url: string) => {
		let allDom = ''
		await request({
			url: url,
			// @ts-ignore
			'User-Agent': this.fakeUA()
		}, (error: any, response: any, html: string) => {
			if (!error && response.statusCode && html !== null) {
				allDom = html
			}
		})
		return allDom
	}

	//applies a regex to a string and throws an error if it fails in some way
	applyRegex = (string: string, regex: RegExp) => {
		if (string === '') throw 'ERROR: the string we are ment to match with is blank';

		if (string.match(regex) !== null && string.match(regex)!.length === 1) {
			return string.match(regex)![0].trim()
		} else {
			throw `ERROR: some error with finding the substring using ${regex} on ${string}`;
		}
	}
}