/*global require, global*/

var _ = require('lodash');
var blessed = require('blessed');
var through2 = require('through2');

module.exports = {
  stdioFactory: function () {
    return _.merge(through2(), {setRawMode: _.noop});
  },
  screenFactory: function (opts) {
    return new blessed.screen(_.merge({
      input: module.exports.stdioFactory(),
      output: module.exports.stdioFactory(),
    }, opts));
  }
};
