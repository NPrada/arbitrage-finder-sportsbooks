
import { request } from "graphql-request";
import { logJson } from './crawlers/resources/helpers'

export const postFullCrawlObject = async (input: any): Promise<any> => {

	const variables: any = {
		input: input
	}

	const query = `mutation addCrawlResult($input: CrawlResultInput!){
		createCrawlResultContainer(input: $input){
			id
		}
	}`

	let response = null

	await request('https://peak-odds.peakbetting.now.sh/graphql', query, variables)
		.then(res => response = res)
		.catch(err => {
			console.error('Error posting data check post_error.json for full message')
			logJson(err,'post_error')
		});

	return response
}