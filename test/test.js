var assert = require('assert');
var fs = require('fs');
var svg_simplifier = require('../svg_simplifier.js');

describe('Parsing error', function () {
  it('with wrong XML code', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/broken_xml.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.error instanceof Error);
  });

  it('with no svg tag', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/broken_no_svg.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.error instanceof Error);
  });
});

describe('Imported', function () {
  it('multiple path, tags or attributes ignored', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/multiple_path_with_ignored.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(null, result.error);
    var ignored = ['enable-background', 'opacity'];
    for (var i = 0; i < ignored.length; i++) {
      assert.equal(ignored[0], result.ignored[0]);
    }
    assert.equal(true, result.path.length > 1);
    assert.equal(48, result.width);
    assert.equal(48, result.height);
    assert.equal(0, result.x);
    assert.equal(0, result.y);
  });

  it('single path, tags or attributes ignored', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/single_path_with_ignored.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.ignored.length > 0);
    assert.equal(true, result.isModified);
    assert.equal(true, result.path.length > 1);
  });

  it('single path, nothing to ignore', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/single_path.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.ignored.length == 0);
    assert.equal(false, result.isModified);
  });

  it('multiple path, nothing to ignore', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/multiple_path.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.ignored.length == 0);
    assert.equal(true, result.path.length > 1);
    assert.equal(true, result.isModified);
  });

  it('nothing to show, nothing to ignore', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/nothing_to_show.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.ignored.length == 0);
    assert.equal(true, result.path.length == 0);
    assert.equal(false, result.isModified);
  });

  it('nothing to show, tags or attributes ignored', function () {
    var svgData = fs.readFileSync(__dirname +'/test_data/nothing_to_show_with_ignored.svg', 'utf8');
    var result = svg_simplifier(svgData);
    assert.equal(true, result.ignored.length > 0);
    assert.equal(true, result.path.length == 0);
    assert.equal(true, result.isModified);
  });
});
