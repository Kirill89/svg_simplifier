var XMLDOMParser = require('xmldom').DOMParser;
var SvgPath = require('svgpath');

var svgPresentationAttributes = {};
([
  'alignment-baseline',
  'baseline-shift',
  'clip-path',
  'clip-rule',
  'clip',
  'color-interpolation-filters',
  'color-interpolation',
  'color-profile',
  'color-rendering',
  'color',
  'cursor',
  'direction',
  'display',
  'dominant-baseline',
  'enable-background',
  'fill-opacity',
  'fill-rule',
  'fill',
  'filter',
  'flood-color',
  'flood-opacity',
  'font-family',
  'font-size-adjust',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'glyph-orientation-horizontal',
  'glyph-orientation-vertical',
  'image-rendering',
  'kerning',
  'letter-spacing',
  'lighting-color',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'opacity',
  'overflow',
  'pointer-events',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'stroke',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'unicode-bidi',
  'visibility',
  'word-spacing',
  'writing-mode'
]).forEach(function (value) {svgPresentationAttributes[value] = true;});

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
// Walk through full svg (XML) tree and merge all 'path' tags by recursive
//
// svgElement - root XML node (tag 'svg')
//
// ignoreAttributesCallback - function (xmlElement, attributesArray) - callback function to inform about ignoring attributes to current node
//
// ignoreTagsCallback - function (xmlElement) - callback function to inform about ignoring tag
//
// transform - only for recursive call, contains 'transform' attribute data for all parent nodes
//
// result - only for recursive call, contains one iteration result and 'path' tags count
//
// Returns object {'path':(string), 'count':(integer)}
//
function merge_paths(svgElement, ignoreAttributesCallback, ignoreTagsCallback, transform, result) {
  if (!transform) {
    transform = '';
  }
  if (!result) {
    result = {'path':'', 'count':0};
  }

  // Callback for tag if it contains unsupported attributes
  function ignoreAttributes(tag) {
    if (typeof(ignoreAttributesCallback) == 'function') {
      var ignoredAttributes = find_presentation_attributes(tag);
      if (ignoredAttributes.length > 0) {
        ignoreAttributesCallback(tag, ignoredAttributes);
      }
    }
  }

  for (var i = 0; i < svgElement.childNodes.length; i++) {
    var childElement = svgElement.childNodes[i];
    if (!childElement.tagName) { // It is not tag
      continue;
    }

    switch (childElement.tagName) {
    // TODO: Add here converting shapes to paths
    case 'g':
      if (childElement.childNodes) {
        // For 'g' tag make recursive tree scan with appending current transform attribute value
        result = merge_paths(childElement, ignoreAttributesCallback, ignoreTagsCallback, childElement.hasAttribute('transform')
          ? transform + ' ' + childElement.getAttribute('transform')
          : transform, result);

          ignoreAttributes(childElement);
      }
      break;
    case 'path':
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
      result.path += path;
      result.count++;

      ignoreAttributes(childElement);
      break;
    case 'metadata': // Just ignore this tag
      break;
    case 'title': // Just ignore this tag
      break;
    case 'desc': // Just ignore this tag
      break;
    default: // If tag not processed make callback
      if (typeof(ignoreTagsCallback) == 'function') {
        ignoreTagsCallback(childElement);
      }
      break;
    }
  }

  return result;
}


//
// Calculating viewport size
//
// viewport - object (x, y, width, height) from attributes of 'svg' tag
//
// viewBox - viewbox attribute of 'svg' tag
//
// preserveAspectRatio - preserveaspectratio attribute of 'svg' tag
//
// Returns object (x, y, width, height)
//
function get_real_viewport_size(viewport, viewBox, preserveAspectRatio) {
  if (viewBox) {
    var viewBoxParts = viewBox.split(/[ ,]+/);
    viewBox = {
      'x': parseInt(viewBoxParts[0]),
      'y': parseInt(viewBoxParts[1]),
      'width': parseInt(viewBoxParts[2]),
      'height': parseInt(viewBoxParts[3])
    };
  }
  if (preserveAspectRatio) {
    preserveAspectRatio = (preserveAspectRatio.split(/\s+/))[0]; // Ignoring meetOrSlice parameter
  }

  if (viewBox && preserveAspectRatio) {
    switch (preserveAspectRatio) {
    case 'xMinYMin':
      return {
        'x': viewport.x,
        'y': viewport.y,
        'width': viewBox.width,
        'height': viewBox.height
      };
      break;
    // TODO: Add other cases from here http://www.w3.org/TR/SVG/coords.html#PreserveAspectRatioAttribute
    default:
      return viewBox;
      break;
    }
  } else if (viewBox) {
    return viewBox;
  } else {
    return viewport;
  }
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
  var viewportSize = get_real_viewport_size(
    {
      'x': parseInt(svgTag.getAttribute('x') || 0),
      'y': parseInt(svgTag.getAttribute('y') || 0),
      'width': parseInt(svgTag.getAttribute('width')),
      'height':parseInt( svgTag.getAttribute('height'))
    },
    svgTag.getAttribute('viewBox'),
    svgTag.getAttribute('preserveAspectRatio')
  );
  result.x = viewportSize.x;
  result.y = viewportSize.y;
  result.width = viewportSize.width;
  result.height = viewportSize.height;

  var ignoredTags = {};
  var ignoredAttributes = {};

  // Ignoring attributes for 'svg'
  var ignoredSvgAttributes = find_presentation_attributes(svgTag);
  if (ignoredSvgAttributes.length > 0) {
    result.isModified = true;
  }
  ignoredSvgAttributes.forEach(function (value) {ignoredAttributes[value] = true;});

  // Merging all 'path' tags with apply transformation
  var mergeResult = merge_paths(svgTag, function (xmlElement, attributesArray) {
    result.isModified = true;
    attributesArray.forEach(function (value) {ignoredAttributes[value] = true;});
  }, function (xmlElement) {
    result.isModified = true;
    ignoredTags[xmlElement.tagName] = true;
  });

  // Set result path
  result.path = mergeResult.path;
  // If more then one path combined - set isModified flag
  result.isModified = result.isModified || mergeResult.count > 1;
  // Create ignored array
  result.ignored = Object.keys(ignoredTags).concat(Object.keys(ignoredAttributes));

  return result;
}

module.exports = prepare_svg;
