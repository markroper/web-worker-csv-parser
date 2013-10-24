MAXFILESIZE = 500000;
FIELDTYPES = { STRING:3, NUMERIC:2, DATE:1 };

self._parseFileString = function( strData, strDelimiter ){
			
    	// Check to see if the delimiter is defined. If not,
    	// then default to comma.
    	strDelimiter = (strDelimiter || ",");

    	// Create a regular expression to parse the CSV values.
    	var objPattern = new RegExp(
    		(
    			// Delimiters.
    			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

    			// Quoted fields.
    			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

    			// Standard fields.
    			"([^\"\\" + strDelimiter + "\\r\\n]*))"
    		),
    		"gi"
    		);
    	// Create an array to hold our data. Give the array
    	// a default empty first row.
    	var arrData = [[]];
    	// Create an array to hold our individual pattern
    	// matching groups.
    	var arrMatches = null;
    	// Keep looping over the regular expression matches
    	// until we can no longer find a match.
    	while (arrMatches = objPattern.exec( strData )){
    		// Get the delimiter that was found.
    		var strMatchedDelimiter = arrMatches[ 1 ];
    		// Check to see if the given delimiter has a length
    		// (is not the start of string) and if it matches
    		// field delimiter. If id does not, then we know
    		// that this delimiter is a row delimiter.
    		if (
    			strMatchedDelimiter.length &&
    			(strMatchedDelimiter != strDelimiter)
    			){

    			// Since we have reached a new row of data,
    			// add an empty row to our data array.
    			arrData.push( [] );

    		}
    		// Now that we have our delimiter out of the way,
    		// let's check to see which kind of value we
    		// captured (quoted or unquoted).
    		if (arrMatches[ 2 ]){
    			// We found a quoted value. When we capture
    			// this value, unescape any double quotes.
    			var strMatchedValue = arrMatches[ 2 ].replace(
    				new RegExp( "\"\"", "g" ),
    				"\""
    				);

    		} else {

    			// We found a non-quoted value.
    			var strMatchedValue = arrMatches[ 3 ];

    		}
    		// Now that we have our value string, let's add
    		// it to the data array.
    		arrData[ arrData.length - 1 ].push( strMatchedValue );
    	}
    	// Return the parsed data.
    	return( arrData );
    }
self._getRandValue = function(upperBound, currentVals)
{
	var val = Math.floor(Math.random()*upperBound);
	if(currentVals.indexOf(val) != -1)
		val = self._getRandValue(upperBound, currentVals);
	if(val == 0)
		val++;
	return val;
}
self._determineValueType = function(val)
{
	if(!isNaN(parseFloat(val)) && isFinite(val) || val == ".")
		return FIELDTYPES.NUMERIC;
	else if(Date.parse(val))
		return FIELDTYPES.DATE;
	else
		return FIELDTYPES.STRING;
}
self._determineFieldTypes = function(dataArray, samplePct)
{
	if(!dataArray || !dataArray.length || dataArray.length < 1)
		return null;
	var numRows = dataArray.length;
	//get a good sample percent value
	if(!samplePct || samplePct > 1 || samplePct <= 0)
	{
		if(numRows > 1000000)
			samplePct = .001;
		else if(numRows > 10000)
			samplePct = .01;
		else if(numRows > 100)
			samplePct = .05;
		else
			samplePct = 1;
	}
	fieldTypes = [];
	rowsToCheck = [];
	for(var r = 0; r < numRows * samplePct; r++)
	{
		rowsToCheck.push(self._getRandValue(numRows, rowsToCheck));
		var currRow = dataArray[rowsToCheck[r]];
		for(var c = 0; c < currRow.length; c++)
		{
			var newType = self._determineValueType(currRow[c]);
			if(fieldTypes.length > c)
			{
				if(newType > fieldTypes[c])
					fieldTypes[c] = newType;
			}
			else
			{
				fieldTypes.push(newType);
			}
		}
	}
	return fieldTypes;	
}
	
self.addEventListener('message', function(e) {
	importScripts('./date.js');
	var files = e.data;
	var chartData = [];

	for (var i = 0, f; f = files[i]; i++) 
	{
  		var reader = new FileReader();
		reader.onloadend = function(event)
		{
			if(event.target.readyState == FileReader.DONE)
			{
				var fileAsString = event.target.result;
				chartData = self._parseFileString(fileAsString);
				var fieldTypes = self._determineFieldTypes(chartData);
				
				postMessage({ "csvData": chartData, "fieldTypes": fieldTypes });
			}
		};

		reader.readAsText(f);
	}
}, false);
