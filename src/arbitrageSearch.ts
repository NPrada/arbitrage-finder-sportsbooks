import {SportBookIds, ParsedGameData, MarketNames} from './crawlers/baseCrawler';
import date from 'date-and-time'
import includes from 'lodash/includes'
import { logJson } from "./crawlers/resources/helpers";
import  fs  from "fs";
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'
import filter from 'lodash/filter'
import uniqid  from "uniqid";
import { log } from 'util';

export type FullMatchData = {
  [key in SportBookIds]: Array<ParsedGameData>;
}; 

type GameMatchedData = {
	uuid: string,
	sportName: string,
	competitionName: string,
	date: string,
	team1Name: string,
	team2Name: string
	matches: Array<{sportbookId: SportBookIds, uuid: string}>
	// betsData:{
	// 	[key in SportBookIds]: {	
	// 		markets: {
	// 			[marketName in MarketNames]: {
	// 				bets: Array<{teamKey: 0|1|2, betName: string , odds: number | string}>
	// 			} 
	// 		}
	// 	}
	// }
}

type DataDictionary = {
	[uuid: string]: any
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
	gameDataDictionary: DataDictionary //this is just a const with a list to all the indivitual crawled game data keyd by id

  constructor(allGamesCrawled: FullMatchData) {
		const json:FullMatchData = JSON.parse(fs.readFileSync('./allgamesCrawled.json').toString());
		this.allGamesCrawled = json; //TODO used for development
		this.gameDataDictionary = this.transformToObjectList(json)
  }
	/**
	 * Puts every since gameData that was crawled into an object where each entry is using the uui of the gameData
	 * This is done so we can easily access gameData by id very easily.
	 * Its more efficient than making a function that goes through the entire list looking for the one 
	 * that has the particular uuid
	 * @param FullMatchData 
	 */
	transformToObjectList (FullMatchData:FullMatchData): DataDictionary {
			
		const gameDataDictionary:DataDictionary = {}
		const sportBookIds: Array<SportBookIds> = keys(this.allGamesCrawled)  as Array<SportBookIds>

		sportBookIds.map(sportKey => {
			this.allGamesCrawled[sportKey].map( (gameData:ParsedGameData) => {
				gameDataDictionary[gameData.uuid] = gameData 
			})
		})
		
		return gameDataDictionary
	}

	/**
		 * checks if there alreaady exists a MatchContainer that for that specific game
		 * @param gameData 
		 * @returns {string} uuid of the container that the gamedata can go in or null
		 */
		dataCanBePutInContainer (gameData:ParsedGameData, gameMatchContainers:DataDictionary): string {
			const containersUuids = keys(gameMatchContainers)
			for(let i=0; i < containersUuids.length; i++){
				for(let k=0; k < gameMatchContainers[containersUuids[i]].matches.length; k++){
					const gameUuid = gameMatchContainers[containersUuids[i]].matches[k].uuid
					if (this.isMatching(this.gameDataDictionary[gameUuid], gameData)) { //checks if its matching or not
						return gameMatchContainers[containersUuids[i]].uuid
					}
				}
			}
			return null
		}

		/**
		 * function to create a new blank container with whatever data we need in it
		 * @param gameData1 
		 */
		makeGameMatchContainer (gameData1:ParsedGameData):GameMatchedData {
			return {
				uuid: uniqid(),
				sportName: gameData1.sportName,
				competitionName: gameData1.competitionName,
				date: gameData1.date,
				team1Name: gameData1.team1Name,
				team2Name: gameData1.team2Name,
				matches: [
					{sportbookId:gameData1.sportbookId, uuid: gameData1.uuid},
				]
			}
		}

	search () {
		
		const sportBookIds: Array<SportBookIds> = keys(this.allGamesCrawled)  as Array<SportBookIds>
		const gameMatchContainers: DataDictionary = {}

		sportBookIds.map(sportBookId => {
			this.allGamesCrawled[sportBookId].map( (gameData:ParsedGameData) => {
				const matchedContainerId = this.dataCanBePutInContainer(gameData,gameMatchContainers)
				
				if (!isNil(matchedContainerId) ) {
					gameMatchContainers[matchedContainerId].matches
						.push({
							sportBookId: gameData.sportbookId, 
							uuid: gameData.uuid
						})
				} else {
					const newMatchContainer = this.makeGameMatchContainer(gameData)
					gameMatchContainers[newMatchContainer.uuid] = newMatchContainer
				}
			})
		})

		//filter the containers to only the ones we have matches for
		const filteredMatchContainers = filter(gameMatchContainers, (container:GameMatchedData) => {
			return container.matches.length > 1
		})
		console.log(filteredMatchContainers.length);
		console.log('gameMatchContainers: ',keys(gameMatchContainers).length);
		console.log('gameDatas: ', keys(this.gameDataDictionary).length);
		
		logJson(gameMatchContainers, 'gameMatchContainers')
		logJson(this.gameDataDictionary, 'gameDataDictionary')


		// let profitMargins: Array<{market1: ParsedGameData, market2: ParsedGameData, profitInfo:BetStats }> = []
		// matchesFound.map( (match:{market1:ParsedGameData, market2: ParsedGameData}) => { 
		// 	const team1Max = Math.max(match.market1.team1.odds, match.market2.team1.odds)
		// 	const team2Max = Math.max(match.market1.team2.odds, match.market2.team2.odds)
			
		// 	profitMargins.push({
		// 		market1: match.market1,
		// 		market2: match.market2,
		// 		profitInfo: this.getProfitMargin(team1Max,team2Max,10)
		// 		})
		// })

		//TODO check if a single event matches to multiple events on the same sportsbook
		// const resultreport = this.buildResultsReport(profitMargins)
		// console.log(resultreport)
		// return resultreport
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

	buildResultsReport = (matchesFound:Array<{market1: ParsedGameData, market2: ParsedGameData, profitInfo:BetStats }>): string => {

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
	
  isMatching = (match1:ParsedGameData, match2:ParsedGameData):boolean => {
    if (isNil(match1.competitionName) || isNil(match2.competitionName))
      return false
    if (isNil(match1.team1Name) || isNil(match2.team1Name) || isNil(match1.team2Name) || isNil(match2.team2Name))
			return false
			
		//TODO check for the team name in the substring
		//TODO check to see if the acronim == the first letters of  the other name
		//TODO check if the team1 name matches the team 2 name and if they are you also need to switch the odds you pass in to check the arb  profit
		if (this.isTeamNameMatching(match1.team1Name, match2.team1Name) &&
				this.isTeamNameMatching(match1.team2Name, match2.team2Name)){
			//if(match1.date === match2.date){ //FIXME change this to be strict
				if (match1.sportName === match2.sportName)
					return true
			//} 
		}		
		
      //if (match1.eventName.toLowerCase() === match2.eventName.toLowerCase())
         
    return false
	}
	
	isTeamNameMatching(name1:string,name2:string){

		if (mathcFullString(name1,name2))
			return true 
		else if (matchAcronym(name1,name2))	//tries to match an acronym
			return true
		else if (matchSingleWord (name1, name2))
			return true
		else
			return false
		

		
		//simply checks if the two string are the same
		function mathcFullString(name1:string,name2:string):boolean{
			const whiteSpaceRegex = /\s/g
			return name1.toLowerCase().replace(whiteSpaceRegex,'') === name2.toLowerCase().replace(whiteSpaceRegex,'')
		}

		//creates an acronym for each work and sees if it matches the other unchanged string
		function matchAcronym (name1: string, name2:string):boolean{

			const wordsFirstLetterRegex  = /\b(\w)/g //gets the first letter of each word 
			const name1Acronym = name1.match(wordsFirstLetterRegex).join('').toUpperCase()
			const name2Acronym = name2.match(wordsFirstLetterRegex).join('').toUpperCase()

			return name1Acronym === name2.toUpperCase() || name1.toUpperCase() === name2Acronym 
		}

		/**  checks if any of the words are present in the other string */
		function matchSingleWord (name1:string, name2:string):boolean { //TODO user tests
			const splitRegex  = /\s|-|./g //splits the string by spaces, "-" , "."
			
			const splitName1: Array<string> = name1.toLowerCase().split(splitRegex)
			const splitName2: Array<string> = name2.toLowerCase().split(splitRegex)

			const filteredName1: Array<string> = splitName1.filter(word => word.length > 3); //removes any words that are shorter than 3 char
			const filteredName2: Array<string> = splitName2.filter(word => word.length > 3);

			return includes(filteredName1, name2) || includes(filteredName2, name1)
		}
	}
}