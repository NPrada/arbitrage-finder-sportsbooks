import ApolloClient from "apollo-boost";
import gql from "graphql-tag";
import 'cross-fetch/polyfill';

export const postFullCrawlObject = async (input: any) => {
const client = new ApolloClient({
  uri: "http://peak-odds.peakbetting.now.sh/graphql" //http://localhost:3000/graphql
});


return await client.mutate({
  mutation: gql`mutation insertJob($input: CrawlResultInput!) {
      createCrawlResultContainer(input: $input ) {
          id
      }
  }`,
  variables: {
    input: input
  }
})
	.then(result => console.log(result));
}
