import {SportBookIds, ParsedMarketData} from './crawlers/baseCrawler';
import date from 'date-and-time'
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'
import { type } from 'os';
import { join } from 'path';

export type FullMatchData = {
  [key in SportBookIds]: Array<ParsedMarketData>;
}; 

type GamesMatchData = {
	market1: ParsedMarketData,
	market2: ParsedMarketData
}

type BetStats = {
	arb1: number, //percentage indicates what portion your investment will take up the total winnings.
	returnOnInvestment: number, //percentage
	totStake: number,
	profit: number,
	bet1: { odd: number, stake: number },
	bet2: { odd: number, stake: number }
}

export default class ArbSearch {

  allGamesCrawled: FullMatchData

  constructor(allGamesCrawled: FullMatchData) {
    this.allGamesCrawled = allGamesCrawled;
  }

  search = () => {
    
    const sportbookIds: Array<SportBookIds> = keys(this.allGamesCrawled) as Array<SportBookIds>
    const matchesFound: Array<{market1: ParsedMarketData, market2: ParsedMarketData}> = []
		
    this.allGamesCrawled[sportbookIds[0]].map( market1 => {
      this.allGamesCrawled[sportbookIds[1]].map( market2 => {
				
				if(this.isMatching(market1,market2)){
					matchesFound.push({market1,market2})
				}
    })});
		
		let profitMargins: Array<{market1: ParsedMarketData, market2: ParsedMarketData, profitInfo:BetStats }> = []
		matchesFound.map( (match:{market1:ParsedMarketData, market2: ParsedMarketData}) => { 
			const team1Max = Math.max(match.market1.team1.odds, match.market2.team1.odds)
			const team2Max = Math.max(match.market1.team2.odds, match.market2.team2.odds)
			
			profitMargins.push({
				market1: match.market1,
				market2: match.market2,
				profitInfo: this.getProfitMargin(team1Max,team2Max,10)
				})
		})

		//TODO check if a single event matches to multiple events on the same sportsbook
		const resultreport = this.buildResultsReport(profitMargins)
		console.log(resultreport)
		return resultreport
	}
	
	getProfitMargin = (ev1: number, ev2: number, stake: number):BetStats => {
		const marginPercent = (((1 / ev1) + (1 / ev2)) * 100);
		const stake1 = stake;
		const stake2 = (stake1 * ev1) / ev2;
		const totStake = stake1 + stake2;
		const returnOnInvestment = ((((stake1 * ev1) - totStake) / totStake) * 100)
		return {
			arb1: marginPercent, //percentage indicates what portion your investment will take up the total winnings.
			returnOnInvestment: returnOnInvestment, //percentage
			totStake: totStake,
			profit: (stake1 * ev1) - totStake,
			bet1: { odd: ev1, stake: stake1 },
			bet2: { odd: ev2, stake: stake2 }
		}
	}

	buildResultsReport = (matchesFound:Array<{market1: ParsedMarketData, market2: ParsedMarketData, profitInfo:BetStats }>): string => {

		let smallerResList: number | null= null;
		let smallerSportsbook: SportBookIds | null = null;
		
		const sportbookIds: Array<SportBookIds> = keys(this.allGamesCrawled) as Array<SportBookIds>

		sportbookIds.map(sportbookName => {
			if(isNil(smallerResList) || this.allGamesCrawled[sportbookName].length < smallerResList){
				smallerResList = this.allGamesCrawled[sportbookName].length
				smallerSportsbook = sportbookName
			}
		})

		//check if any were profitable
		let countProfitable = 0
		let findingsString = ''

		matchesFound.map((elem,i) => {
			console.log(`${i+1}. Profitability: ${elem.profitInfo.returnOnInvestment}% `)
			if (elem.profitInfo.returnOnInvestment > 0 ){
				countProfitable++
				findingsString += JSON.stringify(elem, undefined, 2)
				console.log(JSON.stringify(elem, undefined, 2))	
				console.log('SUCCESS: we found a profitable arbitrage!!')
			}
		})
		
		if(smallerResList === null) smallerResList = 0
		let now = new Date();
		date.format(now, 'YYYY/MM/DD HH:mm:ss');	

		const matchPercentage = Math.round((matchesFound.length / smallerResList)*10000)/100
		return `Ran the crawl task at ${date.format(now, 'YYYY/MM/DD HH:mm:ss')}
Out of ${smallerResList} games on ${smallerSportsbook} we found ${matchesFound.length} matches ~${matchPercentage}%.
${countProfitable} were profitable arbitrages.
${findingsString}`
	}
	
  isMatching = (match1:ParsedMarketData, match2:ParsedMarketData):boolean => {
    if (isNil(match1.eventName) || isNil(match2.eventName))
      return false
    if (isNil(match1.team1.name) || isNil(match2.team1.name) || isNil(match1.team2.name) || isNil(match2.team2.name))
      return false
		
		if(match1.sportName === match2.sportName){
			debugger
		}
		//TODO check for the team name in the substring
		//TODO check to see if the acronim == the first letters of  the other name
		//TODO check if the team1 name matches the team 2 name and if they are you also need to switch the odds you pass in to check the arb  profit
		if (this.isTeamNameMatching(match1.team1.name, match2.team1.name) ||
				this.isTeamNameMatching(match1.team2.name, match2.team2.name)){
					if(match1.date === match2.date){
						if (match1.sportName === match2.sportName)
							return true
					} 
				
		}		
		
        //if (match1.eventName.toLowerCase() === match2.eventName.toLowerCase())
         
    return false
	}
	
	isTeamNameMatching(name1:string,name2:string){
		const whiteSpaceRegex = /\s/g
		const wordsFirstLetterRegex  = /\b(\w)/g //gets the first letter of each word 
		
		const name1Acronym = name1.match(wordsFirstLetterRegex).join('').toUpperCase()
		const name2Acronym = name2.match(wordsFirstLetterRegex).join('').toUpperCase()
		
		if(name1.toLowerCase().replace(whiteSpaceRegex,'') === name2.toLowerCase().replace(whiteSpaceRegex,'') ){
			return true 
		}
		else if (name1Acronym === name2.toUpperCase() || name1.toUpperCase() === name2Acronym ){ //tries to match an acronym
			return true
		}

		//checks if any of the words are present in the other string
		function matchWord (name1:string, name2:string):boolean { //TODO user tests
			const splitRegex  = /\s|-|./g //splits the string by spaces, "-" , "."
			
			const splitName1 = name1.split(splitRegex)
			const splitName2 = name2.split(splitRegex)
			
			let res: boolean

			splitName1.find((elem:string) => {
				return elem === name2
			})

			splitName2.find((elem:string) => {
				return elem === name1
			})

			return true
		}
	}
}