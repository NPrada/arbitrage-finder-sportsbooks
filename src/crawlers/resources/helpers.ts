import fs from 'fs'

//just a helper if you want to log out html to a file for debugging purposes
export const logHtml = (html: string | null | undefined) => {
  const fileName = 'HtmlLog.html'
  fs.writeFile('debugging/'+fileName, html, function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

/**
 * saves json object into file of your naming
 * @param json 
 * @param fileName 
 */
export const logJson = (json: object | null | undefined, fileName:string) => {
   fs.writeFile('debugging/'+fileName+'.json', JSON.stringify(json), function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

/**
 * Gets Json object from a .json file saved somewhare
 * @param path path to json file
 */
export function getJsonFromFile (path: string): Object{
	return JSON.parse(fs.readFileSync(path+'.json').toString());
}

/**
 * converts hrtime into seconds 
 * @param hrtime 
 */
export function parseHrtimeToSeconds(hrtime: Array<number>) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
}
