# arbitrage-finder
project to find profitable arbitrages on betting websites

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

- Copy the dist folder onto the server
- Run `npm install`
- Run `npm run testdeployment` you should get an email
- Run `npm run deploy`

### Checking on crontab
- `/etc/init.d/cron status` see the status of crontab, if its alive or dead
- `crontab -l` view the config file with all the jobs listed
- `/etc/init.d/crond start`
- `/etc/init.d/crond stop`

### TODO
- https://github.com/GoogleChrome/puppeteer/issues/3443#issuecomment-433096772
