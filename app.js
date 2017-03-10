// load required Nodejs modules
var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');

var filesToLoad, storedList = [];

//configure and start web server
app.use('/', express.static(path.join(__dirname, '')));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`App is running on port ${ PORT }`);
});

//define path variables
let listFileName = __dirname + '/filelist.json';
let dataPath = __dirname + '/data/';

//read all files from /data folder
fs.readdir(dataPath, 'utf8', (err, files) =>{
	if (err) {
        throw 'error reading data folder ' + err;
    }

    // exclude files which starts with '.'
     files = files.filter( d => { return  d.charAt(0) !== '.' });
	//console.log('files :', files);

	// try to load filelist.json file
    if ( fs.existsSync( listFileName) ) 
        fs.readFile( listFileName, 'utf8', (err, data) => {
            if (err) {
                console.log(listFileName, 'error loading', err);
                // create it if not exist
                createFileList(files);
                return
            }

            // retrieve a stored file list
            storedList = JSON.parse( data ); 
            //console.log('storedList', storedList, storedList.length);
            
            // check if stored files are up-to-date
			checkStat( files, (changed) => {
	            if (changed) {
	            	console.log('changed');
	            	//if not -> update list
	            	createFileList(files);
	            }
	            // if exist and no error -> get filenames list
	            else filesToLoad = storedList.map( f => { return f.name} );
			});		            
        });
    else {
        console.log(listFileName, 'not found');
        // create it if not exist
        createFileList(files);
    }
})

// compare if stored file names are up-to-date
function checkStat( files, cb ){

	var tmp = files.map( f => { return f } );  // copy an Array.
	var changed = false;

	let fileName = tmp.shift();
	if (fileName) checkFile(fileName);

	// recursively check all filenames in tmp
	function checkFile (fileNm){

		fs.stat(dataPath + '/' + fileNm, (err, stat) => { 

			let file = storedList.find( (f, idx, arr) => { 
				return fileNm === f.name
			});

			if ( !file || +file.size !== +stat.size || +file.ctime !== stat.ctime.getTime() ){
				storedList.push({
					name: fileNm,
					size: +stat.size,
					ctime: stat.ctime.getTime()
				});
				changed = true;
			}

			fileName = tmp.shift();
			if (fileName) checkFile(fileName);
			else cb(changed);

		});
	}
}

// create filelist.json
function createFileList(files){

	if (!storedList.length) checkStat( files, () => { complete() } );
	else complete();

	function complete(){
    	fs.writeFile(listFileName, JSON.stringify(storedList), (err) => {
			if (err) throw err;
			console.log(listFileName, 'is saved!');
		});

		filesToLoad = storedList.map( f => { return f.name} );
	}
}


//configure URL to get a file list
app.get('/list/', function (req, res) {

	if (!filesToLoad)
		res
            .status(409)
            .json([{"status": "fail"}])
            .end();
	else res
            .json(filesToLoad)
            .end();

});
