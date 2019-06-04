# arbitrage-finder
project to find profitable arbitrages 

###Commands available
`npm run build` compiles everything in src and runs index.js
`npm run server` compiles everything in src and runs /server/server.js
`npm run compile` compiles everything in src into dist

###Typescript FAQ

TS2531: Object is possibly 'null'.
Solution --> https://stackoverflow.com/a/40350534/4704145


### Dictionary / naming conventions

- **fixture**: is 1 game between two teams, and it will contain a list of 'games'
- **game**: is an event played by two teams containing one or more sportbooks markets
- **market**: is something you can wager on, one game might have multiple markets like the ouright or to win by x points
- **bet**: is one or more outcomes of a single market, eg the market might be "Outright Win" and the bet is "Liverpool win"
- **competition**: tournament / league name that a game is part of

### How to manually deploy
- Run `npm run build`
- Copy the dist folder onto the server
- Run `npm install`
- Run `npm run testdeployment` you should get an email
- Run `npm run deploy`

### TODO
- https://github.com/GoogleChrome/puppeteer/issues/3443#issuecomment-433096772
- do not match games on the same sportsbook
