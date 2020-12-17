var fs = require('fs'); 
var readline = require('readline');
var http = require('http');
var https = require('https');
var words = {};
let finalArray = [];

function analyze(){
    var get = http.get('http://norvig.com/big.txt').on('response', function (response) {
        var start = new Date().getTime();
        console.log("Fetching file...");
        response.pipe(fs.createWriteStream('input.txt'));
        response.on('end', function () {
            console.log("File fetching completed.");
            console.log("Time taken to fetch the file: ", Math.ceil((new Date().getTime() - start)/1000));
            const file = readline.createInterface({ 
                input: fs.createReadStream('input.txt'), 
                output: process.stdout, 
                terminal: false
            });

            var top = {};
            var max = 0;
            console.log("Reading input file line by line...");

            file.on('line', (line) => {
                line = line.replace("'s", "").replace(/[^a-zA-Z ]/g, "");
                let arr = line.split(" ");
                for(let i=0;i<arr.length;i++){
                    if(arr[i].trim().length > 0){
                        words[arr[i]] = words[arr[i]]?words[arr[i]]+1:1;
                    }
                }
            });

            file.on('close', async function(){
                console.log("Done reading lines.");
                let result = Object.keys(words).map((key) => [key, words[key]]);
                result.sort(function(a, b){return b[1] - a[1]});
                var end = new Date().getTime();
                console.log("Total runtime: ", Math.ceil((end - start)/1000));
                let promises = [];
                for(let i=0;i<10;i++){
                    let url = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=dict.1.1.20170610T055246Z.0f11bdc42e7b693a.eefbde961e10106a4efa7d852287caa49ecc68cf&lang=en-ru&text=${result[i][0]}`;
                    promises.push(lookup(url, result[i][0]));
                }
                Promise.all(promises).then(function(){
                    console.log(finalArray);
                    return finalArray;
                });
            });
        });
    });
}

function lookup(url, word){
    return new Promise((resolve, reject) => {
        https.get(url).on('response', function (response) {
            let data = [];
            response.on('data', function(chunk){
                data.push(chunk);
            }).on('end', function(){
                let jsonResult = JSON.parse(data.toString());
                // console.log(jsonResult);
                let jsonObject = {
                    word: word,
                    output: {
                        count: words[word],
                        synonyms: [],
                        pos: []
                    }
                };
                if(jsonResult.def.length > 0){
                    for(let i=0; i < jsonResult.def.length;i++){
                        let synonyms = jsonResult.def[i].tr[0].mean?jsonResult.def[i].tr[0].mean:[];
                        // console.log("synonyms: ", synonyms);
                        for(let j=0;j<synonyms.length;j++){
                            jsonObject.output["synonyms"].push(synonyms[j].text);
                        }
                        if(jsonResult.def[i].tr[0].pos != undefined){
                            jsonObject.output["pos"].push(jsonResult.def[i].tr[0].pos);
                        }
                    }
                }
                // console.log(jsonObject);
                finalArray.push(jsonObject);
                resolve(true);
            });
        });
    });
}

analyze();