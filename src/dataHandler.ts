import {SportBookIds, ParsedGameData, BetData, MarketNames} from './crawlers/baseCrawler';
import date from 'date-and-time'
import includes from 'lodash/includes'
import { findMarketObject, logJson } from "./crawlers/resources/helpers";
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'
import filter from 'lodash/filter'
import find from 'lodash/find'
import maxBy from 'lodash/maxBy'
import uniqid  from "uniqid";
import { log } from 'util';

export type FullMatchData = {
  [key in SportBookIds]: Array<ParsedGameData>;
}; 

type GameDataContainer = {
	uuid: string,
	sportName: string,
	competitionName: string,
	date: string,
	team1Name: string,
	team2Name: string
	matchedGames: Array<{sportbookId: SportBookIds, uuid: string}>
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

export default class DataHandler {

  allGamesCrawled: FullMatchData
	gameDataDictionary: DataDictionary //this is just a const with a list to all the indivitual crawled game data keyd by id

  constructor(allGamesCrawled: FullMatchData) {
		this.allGamesCrawled = allGamesCrawled;
		this.gameDataDictionary = this.transformToObjectList(allGamesCrawled)
  }
	/**
	 * Puts every gameData that was crawled into an object, where each key is the uuid of the 
	 * gameData and the data is the gameData object
	 * This is done so we can easily access gameData by id very easily.
	 * Its more efficient than making a function that goes through the entire list looking for the one 
	 * that has the particular uuid
	 * @param FullMatchData 
	 */
	transformToObjectList (FullMatchData:FullMatchData): DataDictionary {
			
		const gameDataDictionary:DataDictionary = {}
		const sportbookIds: Array<SportBookIds> = keys(this.allGamesCrawled)  as Array<SportBookIds>
		
		sportbookIds.map(sportKey => {
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
		makeGameMatchContainer (gameData1:ParsedGameData):GameDataContainer {
			return {
				uuid: uniqid(),
				sportName: gameData1.sportName,
				competitionName: gameData1.competitionName,
				date: gameData1.date,
				team1Name: gameData1.team1Name,
				team2Name: gameData1.team2Name,
				matchedGames: [
					{sportbookId:gameData1.sportbookId, uuid: gameData1.uuid},
				]
			}
		}
	
	matchGames () {
		
		const sportbookIds: Array<SportBookIds> = keys(this.allGamesCrawled)  as Array<SportBookIds>
		const gameContainersDictionary: DataDictionary = {}

		sportbookIds.map(sportbookId => {
			this.allGamesCrawled[sportbookId].map( (gameData:ParsedGameData) => {
				const matchedContainerId = this.dataCanBePutInContainer(gameData,gameContainersDictionary)
				
				if (!isNil(matchedContainerId) ) {
					gameContainersDictionary[matchedContainerId].matches
						.push({
							sportbookId: gameData.sportbookId, 
							uuid: gameData.uuid
						})
				} else {
					const newMatchContainer = this.makeGameMatchContainer(gameData)
					gameContainersDictionary[newMatchContainer.uuid] = newMatchContainer
				}
			})
		})

		return gameContainersDictionary
	}

	getProfitability(gameContainersDictionary: DataDictionary){

		//filter the containers to only the ones we have matches for
		const filteredMatchContainers: Array<GameDataContainer> = filter(gameContainersDictionary, (container:GameDataContainer) => {
			return container.matchedGames.length > 1
		})

		//start the part where we get the profitability of each match we found
		let profitMargins: Array<{market1: ParsedGameData, market2: ParsedGameData, profitInfo:BetStats }> = []

		filteredMatchContainers.forEach((container:GameDataContainer) => {
			const gameDatasArr: Array<ParsedGameData> = container.matchedGames.map(gameData => {
				return this.gameDataDictionary[gameData.uuid]
			});
			
			const arbitraryTeam1 = gameDatasArr[0].team1Name
			const arbitraryTeam2 = gameDatasArr[0].team2Name
			const team1Bets: Array<BetData> = []
			const team2Bets: Array<BetData> = []
			
			gameDatasArr.map(gameData => {
				team1Bets.push(this.getOutrightBetByTeamName(gameData, arbitraryTeam1))
				team2Bets.push(this.getOutrightBetByTeamName(gameData, arbitraryTeam2))
			})

			const team1BestOdds = maxBy(team1Bets, (bet: BetData):number => {return bet.odds})
			const team2BestOdds = maxBy(team2Bets, (bet: BetData):number => {return bet.odds})

			profitMargins.push({
				market1: this.gameDataDictionary[team1BestOdds.parentUuid],
				market2: this.gameDataDictionary[team2BestOdds.parentUuid],
				profitInfo: this.getProfitMargin(team1BestOdds.odds,team2BestOdds.odds,10)
				})
		})
		
		//TODO check if a single event matches to multiple events on the same sportsbook
		const resultreport = this.buildResultsReport(profitMargins)
		console.log(resultreport)
		return resultreport
	}

	getProfitMargin (ev1: number, ev2: number, stake: number):BetStats {
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
	
	//gets the outright bet of the teamName that was passed in
	getOutrightBetByTeamName (gameData: ParsedGameData, teamName: string, marketName: MarketNames = 'outright'): BetData {
		try {
			const marketData = findMarketObject(marketName, gameData.markets)
			const teamKey = this.isTeamNameMatching(gameData.team1Name,teamName)? 1 : 2;
			return find(marketData.bets, (bet) => {
				return bet.teamKey === teamKey
			})
		}
		catch(err){
			console.log('-------------------------------------------')
			console.log('gameData',gameData);
			console.log('ERROR:'+ err);
			
		}
	
	}


	isTeamNameMatching (name1:string,name2:string) {

		if (matchFullString(name1,name2))
			return true 
		else if (matchAcronym(name1,name2))	//tries to match an acronym
			return true
		else if (matchSingleWord (name1, name2))
			return true
		else
			return false
		
		//simply checks if the two string are the same
		function matchFullString(name1:string,name2:string):boolean{
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
			//if(match1.date === match2.date){ //FIXME change this to be strict also you probably need to add localization for EGB
				if (match1.sportName === match2.sportName)
					return true
			//} 
		}		
		
      //if (match1.eventName.toLowerCase() === match2.eventName.toLowerCase())
         
    return false
	}
	
	
}