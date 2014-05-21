var fs = require('fs');
var svg_simplifier = require('./svg_simplifier.js');

var input = process.argv[2];
var output = process.argv[3];

var svgData = fs.readFileSync(input, 'utf8');
var simplifierData = svg_simplifier(svgData);
var outputData = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
outputData += '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"';
outputData += '    "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
outputData += '<svg version="1.1"';
outputData += '     baseProfile="full"';
outputData += '     xmlns="http://www.w3.org/2000/svg"';
outputData += '     xmlns:xlink="http://www.w3.org/1999/xlink"';
outputData += '     xmlns:ev="http://www.w3.org/2001/xml-events"';
outputData += '     width="50" height="50">';
outputData += '     <path d="' + simplifierData.path + '"/>';
outputData += '</svg>';
console.log(simplifierData);
fs.writeFileSync(output, outputData, 'utf8');
