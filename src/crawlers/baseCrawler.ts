import request from 'request-promise-native'
import { UAs } from './resources/useragentList'

export type SportName = "csgo" | "lol" | "dota2" | "rainbow6" | "sc2"| "overwatch" | "callofduty" //possible additions: hearthstone, rocket league(might have ties),
export type MarketNames = "outright"
export type SportBookIds = 'skybet' | 'egb'

export interface RawGameData {
	sportbookId: SportBookIds
	competitionName: string | null
	sportName: string | null
	date: string | null
	team1Name: string | null
	team2Name: string | null
	markets: {
		[marketName in MarketNames]: {
			bets: Array<{teamKey: 0|1|2, betName: string , odds: number | string}>
		} | null
	} | any
	matchType?: string | null
	pageHref?: string | null
	error?: string | null
}


// TODO use this schema instead
export interface ParsedGameData { 
	uuid: string
	sportbookId: SportBookIds,
	competitionName: string
	sportName: string 		
	date: string 
	team1Name: string
	team2Name: string
	markets: {
		[marketName in MarketNames]: {
			bets: Array<{teamKey: 0|1|2, betName: string, odds: number}>
		}
	}
	matchType?: string 
	pageHref?: string
	error?: string 
}

// const exampleParsedMarketData:ParsedMarketData = { 
// 	uuid: '123',
// 	sportbookId: 'skybet',
// 	competitionName: 'katovice',
// 	sportName: 'csgo',	
// 	date: '1/2/1992' ,
// 	team1Name: 'Nip',
// 	team2Name: 'Fnatic',
// 	markets: {
// 		outright: {
// 			bets: [
// 				{ teamKey: 1, betName: 'win', odds: 1.2},
// 				{ teamKey: 2, betName: 'win', odds: 1.4},
// 				{ teamKey: 0, betName: 'draw',odds: 1.4}
// 			]
// 		}
// 	}
// }

export default class BaseCrawler {

    sportBookId: SportBookIds
    constructor(sportBookId: SportBookIds, ) {
        this.sportBookId = sportBookId
    }

		sleep = require('util').promisify(setTimeout) //makes setTimeout return a promise so we can just use await
    
    initializeEventData = (): RawGameData => {
			return {
				sportbookId: this.sportBookId,
				competitionName: null,
				sportName: null,
				date: null,
				team1Name: null,
				team2Name: null,
				markets: {}
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
				const callofdutyRegex = /(?<!.)(callofduty|cod)(?!.)|(call|c)[-—:_/](of|o)[-—:_/](duty|d)/g

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
				else if(callofdutyRegex.test(parsedSportName))
						return 'callofduty'
        else{
            throw `unknown sportname -> ${parsedSportName}`
        }
    }
    
    //gets a random user agent
    fakeUA = (): string => {
			return UAs[Math.floor(Math.random() * UAs.length)]
    }

		formatOdds = (rawOdd: any):number => { //add a lot of unit tests
			if(rawOdd === '' )
				throw 'odd patter was unrecognized'

			let parsedOdd: number

			if(rawOdd.indexOf('/') !== -1){
				const twoNum: Array<string> = rawOdd.split('/')
        parsedOdd = Math.floor((Number(twoNum[0])/Number(twoNum[1])+1)*100)/100
			}else{
				parsedOdd = Number(rawOdd)
			}
			
			if(isNaN(parsedOdd)) throw 'odd pattern was unrecognized & could not convert to number'

			return parsedOdd
		}

		//checks for any errors and throws them if it finds any
		checkForErrors = (rawMarketData: RawGameData): string | null => {

			if (rawMarketData.error) return rawMarketData.error
      if (!rawMarketData.sportName) return 'No raw sport name was found'   	
      if (!rawMarketData.date) return 'No raw date info was found'        	
      if (!rawMarketData.competitionName) return 'No raw event name was found'   	
			if (!rawMarketData.team1Name || !rawMarketData.team2Name) return 'No team name data was found'
			//TODO add checks for the sigle bets
      // if (!rawMarketData.team1.name || !rawMarketData.team2.name) return 'No raw team name was found'
			// if (!rawMarketData.team1.odds || !rawMarketData.team2.odds) return 'No raw team odds were found'
			
			return null
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