
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