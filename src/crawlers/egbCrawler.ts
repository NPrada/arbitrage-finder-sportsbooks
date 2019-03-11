import cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import isNil from 'lodash/isNil'
import {fetchHtml, logHtml, applyRegex} from './helpers/helpers';
import {EventData} from '../types'

const baseURL = 'https://egb.com';
const sportBookId = 'egb';

const runEGBCrawler = async () => {

    //const allDom = await fetchHtml(`${baseURL}/play/simple_bets`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${baseURL}/play/simple_bets`, {waitUntil: 'networkidle2'});

    let allDom = await page.evaluate(() => document.body.innerHTML);

    if (isNil(allDom) || allDom === '')
        throw `${baseURL}/play/simple_bets got no dom`
        
    const $ = cheerio.load(allDom)
    const eventsTable = $('.table-bets', '.content').find('.table-bets__main-row-holder')

    if (eventsTable === null )
        throw `Error: could not find the table containing all the events`

    console.log(eventsTable.length)
    
    for(let i=0; i < eventsTable.length; i++ ){
        getRowData(eventsTable.eq(i).html())
    }


    await browser.close();
}

export default runEGBCrawler

export const getRowData = async (tableRow: string | null)  => {
    const matchData: EventData = {
        sportbookId: sportBookId,
        eventName: null,
        sportName: null,
        date: null,
        team1: {name: null, odds: null},
        team2: {name: null, odds: null}
    }
  
}