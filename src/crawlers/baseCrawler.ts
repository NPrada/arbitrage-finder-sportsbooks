import request from 'request-promise-native'
import { UAs } from './resources/useragentList'


//TODO add a mandatory date crawled field in the DD-MM-YYYYTHH-MM-SS format
//TODO add a standardise sportname function
type SportName = "csgo" | "lol" | "dota2" | "rainbow6" | "sc2"| "overwatch" //possible additions: hearthstone, rocket league(might have ties),
type SportBookIds = 'skybet' | 'egb'

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

	sportBookId: SportBookIds
	constructor(sportBookId: SportBookIds, ) {
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
	
	standardiseSportName = (rawSportName: string):SportName => {

		const parsedSportName = rawSportName.toLowerCase().replace(/ /g,'');
		
		const csgoRegex = /counter[-—:_/]strike|cs[:]go|(?<!.)csgo(?!.)|(?<!.)counterstrike(globaloffensive|go)(?!.)/g
		const dota2Regex = /dota[-—:_/]2|(?<!.)dota(2|)(?!.)/g
		const lolRegex = /(league|l)[-—:_/](of|o)[-—:_/](legends|l)|(?<!.)(lol|leagueoflegends)(?!.)/g
		const sc2Regex = /(?<!.)((starcraft|sc)[-—:_/]2|(starcraft|sc)(2|))(?!.)/g
		const overwatchRegex = /(?<!.)(ow|overwatch)(?!.)/g
		const rainbow6Regex = /(?<!.)(r6|rainbow6|rainbow6siege|rainbow[-—:_/]6[-—:_/]siege)(?!.)/g

		if(csgoRegex.test(parsedSportName))
			return 'csgo'
		else if(dota2Regex.test(parsedSportName))
			return 'dota2'
		else if(lolRegex.test(parsedSportName))
			return 'lol'
		else if(sc2Regex.test(parsedSportName))
			return 'sc2'
		else if(overwatchRegex.test(parsedSportName))
			return 'overwatch'
		else if(rainbow6Regex.test(parsedSportName))
			return 'rainbow6'
		else{
			throw `Error: unknown sportname -> ${parsedSportName}`
		}
	}
	
	//gets a random user agent
	fakeUA = (): string => {
		return UAs[Math.floor(Math.random() * UAs.length)]
	}

	//makes a http request and returns the entire dom
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