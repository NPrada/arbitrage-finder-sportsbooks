
export interface EventData {
	sportbookId: string
	eventName: string | null
	sportName: string | null
	date: string | null
	team1: {name: string | null, odds: string | null}
	team2:  {name: string | null, odds: string | null}
	matchType?: string | null
	pageHref?: string | null
	error?: string | null
}

export const initializeEventData = (sportBookId: string): EventData => {
	return{
		sportbookId: sportBookId,
		eventName: null,
		sportName: null,
		date: null,
		team1: {name: null, odds: null},
		team2: {name: null, odds: null}
	}
}