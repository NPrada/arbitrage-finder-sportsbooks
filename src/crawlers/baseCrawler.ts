import request from 'request-promise-native'
import { UAs } from './resources/useragentList'


//TODO add a mandatory date crawled field in the DD-MM-YYYYTHH-MM-SS format
type SportName = "csgo" | "lol" | "dota2" | "rainbow6" | "sc2"| "overwatch" //possible additions: hearthstone, rocket league(might have ties),
export type SportBookIds = 'skybet' | 'egb'
//TODO fix the types to use parsed and raw data type
export interface EventData {
    sportbookId: string
    eventName: string | null
    sportName: string | null
    date: string | null
    team1: { name: string | null, odds: string | null | number}
    team2: { name: string | null, odds: string | null | number}
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

		formatOdds = (rawOdd: any):number => {
			if(rawOdd === '' )
				throw 'odd patter was unrecognized'

			let parsedOdd: number

			if(rawOdd.indexOf('/') !== -1){
				const twoNum: Array<string> = rawOdd.split('/')
        parsedOdd = Math.floor((Number(twoNum[0])/Number(twoNum[1])+1)*100)/100
			}else{
				parsedOdd = Number(rawOdd)
			}
			
			if(isNaN(parsedOdd)) throw 'odd patter was unrecognized & could not convert to number'

			return parsedOdd
		}

    //makes a http request and returns the entire dom
    fetchHtml = async (url: string): Promise<string> => {
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
    getRegexSubstr = (string: string, regex: RegExp):string => {
        if (string === '') throw 'ERROR: the string we are ment to match with is blank';

        if (regex.test(string) && string.match(regex)!.length === 1) {
            return string.match(regex)![0].trim()
        } else {
            throw `ERROR: some error with finding the substring using ${regex} on ${string}`;
        }
    }
}