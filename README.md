# arbitrage-finder
project to find profitable arbitrages on sportsbetting websites
Currently the sportsbooks being scraped are Skybet, Betway and E-gamingbets.com

This project contains 3 webscrapers that get odds data from the three sites, matches it togethere and looks for possible arbitrage opportunities.

### Deploy With pipeline
- Cherry pick onto release branch 
- codeship pipeline runs
- ssh onto server and go into dist folder
- `npm run deploy`

### Dictionary / naming conventions
- **fixture**: is 1 game between two teams, and it will contain a list of 'games'
- **game**: is an event played by two teams containing one or more sportbooks markets
- **market**: is something you can wager on, one game might have multiple markets like the ouright or to win by x points
- **bet**: is one or more outcomes of a single market, eg the market might be "Outright Win" and the bet is "Liverpool win"
- **competition**: tournament / league name that a game is part of


