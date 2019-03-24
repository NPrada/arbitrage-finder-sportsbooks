# arbitrage-finder
project to find profitable arbitrages 

###How to run
`npm run build` runs the compiled main.js

###Typescript FAQ

TS2531: Object is possibly 'null'.
Solution --> https://stackoverflow.com/a/40350534/4704145


### Dictionary / naming conventions

fixture: is 1 game between two teams, and it will contain a list of 'games'
game: is a contents between two teams containing one or more sportbooks markets
market: is something you can wager on, one game might have multiple markets like the ouright or to win by x points
bet: is one or more outcomes of a single market, eg the market might be "Outright Win" and the bet is "Liverpool win"
competition: tournament / league name that a game is part of