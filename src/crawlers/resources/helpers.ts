import fs from 'fs'

//just a helper if you want to log out html to a file for debugging purposes
export const logHtml = (html: string | null | undefined) => {
  const fileName = 'HtmlLog.html'
  fs.writeFile(fileName, html, function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

export const logJson = (html: string | null | undefined, fileName:string) => {
 
  fs.writeFile(fileName+'.json', html, function (err) {
    if (err) {
      return console.log(err);
    }

  });
}

//converts the hrtime into seconds 
export function parseHrtimeToSeconds(hrtime: Array<number>) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
}

export function getRandomArbitrary(min:number, max:number):number {
  return Math.random() * (max - min) + min;
}