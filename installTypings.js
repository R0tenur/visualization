var https = require('https');
var fs = require('fs');

function download(filename, url) {
  var file = fs.createWriteStream(filename);
  var request = https.get(url, function(response) {
    response.pipe(file);
  });
}

console.log('Downloading azdata proposed typings');
download('src/typings/azdata.proposed.d.ts', 'https://raw.githubusercontent.com/Microsoft/azuredatastudio/master/src/sql/azdata.proposed.d.ts');
