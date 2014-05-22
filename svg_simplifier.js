var XMLDOMParser = require('xmldom').DOMParser;
var SvgPath = require('svgpath');

var svgPresentationAttributes = {
	'alignment-baseline': true,
	'baseline-shift': true,
	'clip-path': true,
	'clip-rule': true,
	'clip': true,
	'color-interpolation-filters': true,
	'color-interpolation': true,
	'color-profile': true,
	'color-rendering': true,
	'color': true,
	'cursor': true,
	'direction': true,
	'display': true,
	'dominant-baseline': true,
	'enable-background': true,
	'fill-opacity': true,
	'fill-rule': true,
	'fill': true,
	'filter': true,
	'flood-color': true,
	'flood-opacity': true,
	'font-family': true,
	'font-size-adjust': true,
	'font-size': true,
	'font-stretch': true,
	'font-style': true,
	'font-variant': true,
	'font-weight': true,
	'glyph-orientation-horizontal': true,
	'glyph-orientation-vertical': true,
	'image-rendering': true,
	'kerning': true,
	'letter-spacing': true,
	'lighting-color': true,
	'marker-end': true,
	'marker-mid': true,
	'marker-start': true,
	'mask': true,
	'opacity': true,
	'overflow': true,
	'pointer-events': true,
	'shape-rendering': true,
	'stop-color': true,
	'stop-opacity': true,
	'stroke-dasharray': true,
	'stroke-dashoffset': true,
	'stroke-linecap': true,
	'stroke-linejoin': true,
	'stroke-miterlimit': true,
	'stroke-opacity': true,
	'stroke-width': true,
	'stroke': true,
	'text-anchor': true,
	'text-decoration': true,
	'text-rendering': true,
	'unicode-bidi': true,
	'visibility': true,
	'word-spacing': true,
	'writing-mode': true
};

var svgAllowedTags = {
  'path': true,
  'metadata': true,
  'title': true,
  'desc': true
};

//
// Find all presentation attributes in tag
//
// tag - xmldom Element object
//
// Returns array with attributes names
//
function find_presentation_attributes (tag) {
  var foundAttributes = [];
  for (var i = 0; i < tag.attributes.length; i++) {
    var attributeName = tag.attributes[i].name;
    if (svgPresentationAttributes[attributeName]) {
      foundAttributes.push(attributeName);
    }
  }
  return foundAttributes;
}

//
// Merge all 'path' tags in svgElement by recursive
//
// svgElement - XML node
//
// transform - only for recursive call, contains 'transform' attribute data for all parent nodes
//
// resultPath - only for recursive call, contains one iteration result
//
// Returns string path
//
function merge_paths(svgElement, transform, resultPath) {
  if (!transform) {
    transform = '';
  }
  if (!resultPath) {
    resultPath = '';
  }

  for (var i = 0; i < svgElement.childNodes.length; i++) {
    var childElement = svgElement.childNodes[i];

    if (childElement.tagName == 'g') { // Realy only for 'g'. Another container elements not supported yet
      if (childElement.childNodes) {
        // For 'g' tag make recursive tree scan with appending current transform attribute value
        resultPath = merge_paths(childElement, childElement.hasAttribute('transform')
          ? transform + ' ' + childElement.getAttribute('transform')
          : transform, resultPath);
      }
    } else if (childElement.tagName == 'path') {
      var fullTransformString = transform;
      if (childElement.hasAttribute('transform')) {
        fullTransformString += ' ' + childElement.getAttribute('transform');
      }

      var path = childElement.getAttribute('d');

      if (fullTransformString != '') {
        // Apply transform attributes
        path = (new SvgPath(path))
          .transform(fullTransformString)
          .toString();
      }

      // Merge paths
      resultPath += path;
    }
  }

  return resultPath;
}

//
// Prepares SVG data to use as glyph icon.
//
// svgData - XML data from SVG file
//
// Returns
// {
//    'error': (error),
//    'isModified': (boolean),
//    'ignored': (array of strings),
//    'path': (string),
//    'width': (integer),
//    'height': (integer),
//    'x': (integer),
//    'y': (integer)
// }
//
function prepare_svg(svgData)
{
  var result = {
    'error': null,
    'isModified': false,
    'ignored': [],
    'path': '',
    'width': 0,
    'height': 0,
    'x': 0,
    'y': 0
  };

  // Parse with custom error handler
  var xmlDoc = (new XMLDOMParser({
    'locator': {}, // From xmldom documentation: locator is always need for error position info
    'errorHandler': {
      'warning': function (w) {},
      'error': function (e) {result.error = e;},
      'fatalError': function (e) {result.error = e;},
    }
  })).parseFromString(svgData, 'application/xml');;

  // In svg file must be a svg tag
  var svgTags = xmlDoc.getElementsByTagName('svg');
  if (svgTags.length < 1) {
    result.error = new Error('No \'svg\' tag specified');
  }

  if (result.error) {
    return result;
  }

  var svgTag = svgTags[0];

  // Calculate svg canvas size
  var viewBox = (svgTag.getAttribute('viewBox') || '').split(' ');
  result.x = parseInt(viewBox[0] || svgTag.getAttribute('x') || 0);
  result.y = parseInt(viewBox[1] || svgTag.getAttribute('y') || 0);
  result.width = parseInt(viewBox[2] || svgTag.getAttribute('width'));
  result.height = parseInt(viewBox[3] || svgTag.getAttribute('height'));

  var ignoredTags = {};
  var ignoredAttributes = {};

  // Add tags by name to tags ignore list
  var allTags = svgTag.getElementsByTagName('*');
  for (var i = 0; i < allTags.length; i++) {
    // TODO: Add here converting shapes to paths (and append resulting paths to XML tree),
    // don't forget add your tag to svgAllowedTags object
    if (!svgAllowedTags[allTags[i].tagName]) {
      result.isModified = true;
      ignoredTags[allTags[i].tagName] = true;
    }
  }

  // Search for ignored attributes and add it to ignoredAttributes object
  function add_ignored_attributes(tag) {
    var attributes = find_presentation_attributes(tag);
    for (var j = 0; j < attributes.length; j++) {
      result.isModified = true;
      ignoredAttributes[attributes[j]] = true;
    }
  }

  // Ignoring attributes for 'svg'
  add_ignored_attributes(svgTag);

  // Check for multiple 'path' tag
  var pathTags = svgTag.getElementsByTagName('path');
  if (pathTags.length > 1) {
    result.isModified = true;
  }

  // Merging all 'path' tags with apply transformation
  result.path = merge_paths(svgTag);

  result.ignored = Object.keys(ignoredTags).concat(Object.keys(ignoredAttributes));

  return result;
}

module.exports = prepare_svg;
