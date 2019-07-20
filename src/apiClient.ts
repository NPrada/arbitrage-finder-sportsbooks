import 'cross-fetch/polyfill';
import fetch from 'isomorphic-fetch'

export const postFullCrawlObject = async (input: any) => {
fetch('http://peak-odds.peakbetting.now.sh/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
    query: `mutation ($input: CrawlResultInput){
					createCrawlResultContainer(input: $input){
						id
					}
			}`,
    variables: { input: input }
  })
})	
	.then(res => {
		console.log('res',res)
		return res	
	})
  .then(res => res.json())
}