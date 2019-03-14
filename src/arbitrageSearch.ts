import {SportBookIds, EventData} from './crawlers/baseCrawler';
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'

type FullMatchData = {
  [key in SportBookIds]: Array<EventData>;
}; 

export default class ArbSearch {

  allGamesCrawled: FullMatchData

  constructor(allGamesCrawled: FullMatchData) {
    this.allGamesCrawled = allGamesCrawled;
  }

  search = () => {
    
    const sportbookIds: Array<SportBookIds> = keys(this.allGamesCrawled) as Array<SportBookIds>
    const matchesFound: Array<{elem1: EventData, elem2: EventData}> = []
    
    this.allGamesCrawled[sportbookIds[0]].map( elem1 => {
      this.allGamesCrawled[sportbookIds[1]].map( elem2 => {
		
			
				if(this.isMatching(elem1,elem2)){
					matchesFound.push({elem1,elem2})
				}
    })});
    

		//TODO check if a single event matches to multiple events on the same sportsbook
		console.log(this.buildResultsReport(matchesFound,sportbookIds))
	}
	
	buildResultsReport = (matchesFound:Array<{elem1: EventData, elem2: EventData}>, sportbookIds:Array<SportBookIds>): string => {
		
		let smallerResList: number
		let smallerSportsbook: SportBookIds;
		if (this.allGamesCrawled[sportbookIds[0]].length < this.allGamesCrawled[sportbookIds[1]].length) {
			smallerResList = this.allGamesCrawled[sportbookIds[0]].length
			smallerSportsbook = sportbookIds[0]
		}else{
			smallerResList = this.allGamesCrawled[sportbookIds[1]].length
			smallerSportsbook = sportbookIds[1]
		}
		const matchPercentage = Math.round((matchesFound.length/this.allGamesCrawled[smallerSportsbook].length)*10000)/100
    return `Out of ${smallerResList} games on ${smallerSportsbook} we found ${matchesFound.length} matches ~${matchPercentage}%`
	}
  isMatching = (match1:EventData, match2:EventData):boolean => {
    if (isNil(match1.eventName) || isNil(match2.eventName))
      return false
    if (isNil(match1.team1.name) || isNil(match2.team1.name))
      return false

    if (match1.team1.name.toLowerCase() === match2.team1.name.toLowerCase())
      if (match1.sportName === match2.sportName)
      return true
        //if (match1.eventName.toLowerCase() === match2.eventName.toLowerCase())
         
    return false
  }
}