var Promise = require('bluebird');
var blessed = require('blessed');
var _ = require('lodash');
var Point = require('text-buffer/lib/point');

var util = require('slap-util');
var baseWidgetOpts = require('./opts');

function BaseWidget (opts) {
  var self = this;

  if (!(self instanceof blessed.Node)) return new BaseWidget(opts);

  opts = _.merge({}, baseWidgetOpts, opts);
  if (!opts.screen) opts.screen = (opts.parent || {}).screen;
  if (!opts.parent) opts.parent = opts.screen;
  var loggerOpts = opts.logger
    || (opts.parent || {}).options.logger
    || (opts.screen || {}).options.logger;
  if (loggerOpts && !util.logger.stream) util.logger(loggerOpts);
  if (self instanceof BaseWidget) blessed.Box.call(self, opts); // this should not be called if an element inherits from built-in blessed classes
  self.focusable = opts.focusable;

  util.logger.debug(util.typeOf(self), 'init {'+Object.keys(opts).join(',')+'}');
  self.ready = Promise.delay(0)
    .then(function () {
      return typeof self._initHandlers === 'function'
        ? self._initHandlers()
        : BaseWidget.prototype._initHandlers.call(self);
    })
    .return(self)
    .tap(function () { util.logger.debug(util.typeOf(self), 'ready'); });
}
BaseWidget.blessed = blessed;
BaseWidget.prototype.__proto__ = blessed.Box.prototype;

BaseWidget.prototype.walkDepthFirst = function (direction, after, fn) {
  if (arguments.length === 2) fn = after;
  var children = this.children.slice();
  if (direction === -1) children.reverse();
  if (after) children = children.slice(children.indexOf(after) + 1);
  return children.some(function (child) {
    return fn.apply(child, arguments) || BaseWidget.prototype.walkDepthFirst.call(child, direction, fn);
  });
};
BaseWidget.prototype.focusFirst = function (direction, after) {
  return this.walkDepthFirst(direction, after, function () {
    if (this.visible && this.focusable) {
      this.focus();
      return true;
    }
  });
};
BaseWidget.prototype._focusDirection = function (direction) {
  var self = this;
  var descendantParent;
  var descendant = self.screen.focused;
  while (descendant.hasAncestor(self)) {
    descendantParent = descendant.parent;
    if (BaseWidget.prototype.focusFirst.call(descendantParent, direction, descendant)) return self;
    descendant = descendantParent;
  }
  if (!self.focusFirst(direction)) throw new Error("no focusable descendant");
  return self;
};
BaseWidget.prototype.focusNext = function () {
  return this._focusDirection(1);
};
BaseWidget.prototype.focusPrev = function () {
  return this._focusDirection(-1);
};
BaseWidget.prototype.focus = function () {
  if (!this.hasFocus()) return blessed.Box.prototype.focus.apply(this, arguments);
  return this;
};
BaseWidget.prototype.isAttached = function () {
  return this.hasAncestor(this.screen);
};
BaseWidget.prototype.hasFocus = function (asChild) {
  var self = this;
  var focused = self.screen.focused;
  return focused.visible && (focused === self || focused.hasAncestor(self) || (asChild && self.hasAncestor(focused)));
};

BaseWidget.prototype.pos = function () {
  return new Point(this.atop + this.itop, this.aleft + this.ileft);
};
BaseWidget.prototype.size = function () {
  if (!this.isAttached()) return new Point(0, 0); // hack
  return new Point(this.height - this.iheight, this.width - this.iwidth);
};

BaseWidget.prototype.shrinkWidth = function () { return this.content.length + this.iwidth; };
BaseWidget.prototype.getBindings = function () {
  return this.options.bindings;
};
BaseWidget.prototype.resolveBinding = function (key, source1, source2, etc) {
  return BaseWidget.resolveBinding.apply(this,
    [key, util.callBase(this, BaseWidget, 'getBindings')].concat([].slice.call(arguments, 1))
  );
};
BaseWidget.resolveBinding = function (key, source1, source2, etc) {
  var bindings = _.merge.apply(null, [{}].concat([].slice.call(arguments, 1)));
  for (var name in bindings) {
    if (bindings.hasOwnProperty(name)) {
      var keyBindings = bindings[name];
      if (!keyBindings) continue;
      if (typeof keyBindings === 'string') keyBindings = [keyBindings];
      if (keyBindings.some(function (binding) { return binding === key.full || binding === key.sequence; }))
        return name;
    }
  }
};

BaseWidget.prototype._initHandlers = function () {
  var self = this;
  self.on('focus', function () {
    util.logger.debug('focus', util.typeOf(self));
    if (!self.focusable) self.focusNext();
  });
  self.on('blur', function () { util.logger.debug('blur', util.typeOf(self)); });
  self.on('show', function () { self.setFront(); });
  self.on('element keypress', function (el, ch, key) {
    switch (util.callBase(this, BaseWidget, 'resolveBinding', key)) {
      case 'hide': self.hide(); return false;
      case 'focusNext': self.focusNext(); return false;
      case 'focusPrev': self.focusPrev(); return false;
    }
  });
};

module.exports = BaseWidget;
