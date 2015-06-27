/*global require, global*/

var _ = require('lodash');
var blessed = require('blessed');
var through2 = require('through2');

module.exports = {
  readStreamFactory: function () {
    return _.merge(through2(), {setRawMode: _.noop});
  },
  writeStreamFactory: function () {
    return _.merge(through2(), {rows: 24, columns: 80});
  },
  screenFactory: function (opts) {
    return new blessed.screen(_.merge({
      input: module.exports.readStreamFactory(),
      output: module.exports.writeStreamFactory()
    }, opts));
  }
};
