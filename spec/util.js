/*global require, global*/

var _ = require('lodash');
var blessed = require('blessed');
var through2 = require('through2');

module.exports = {
  stdioFactory: function () {
    return _.extend(through2(), {setRawMode: _.noop});
  },
  screenFactory: function (opts) {
    return new blessed.screen(_.extend({
      input: module.exports.stdioFactory(),
      output: module.exports.stdioFactory(),
    }, opts));
  }
};
