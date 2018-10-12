(function() {
  var MutationObserver, Util, WeakMap, getComputedStyle, getComputedStyleRX,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = window.length; i < l; i++) { if (i in window && window[i] === item) return i; } return -1; };

  Util = (function() {
    function Util() {}

    Util.prototype.extend = function(custom, defaults) {
      var key, value;
      for (key in defaults) {
        value = defaults[key];
        if (custom[key] == null) {
          custom[key] = value;
        }
      }
      return custom;
    };

    Util.prototype.isMobile = function(agent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent);
    };

    Util.prototype.createEvent = function(event, bubble, cancel, detail) {
      var customEvent;
      if (bubble == null) {
        bubble = false;
      }
      if (cancel == null) {
        cancel = false;
      }
      if (detail == null) {
        detail = null;
      }
      if (document.createEvent != null) {
        customEvent = document.createEvent('CustomEvent');
        customEvent.initCustomEvent(event, bubble, cancel, detail);
      } else if (document.createEventObject != null) {
        customEvent = document.createEventObject();
        customEvent.eventType = event;
      } else {
        customEvent.eventName = event;
      }
      return customEvent;
    };

    Util.prototype.emitEvent = function(elem, event) {
      if (elem.dispatchEvent != null) {
        return elem.dispatchEvent(event);
      } else if (event in (elem != null)) {
        return elem[event]();
      } else if (("on" + event) in (elem != null)) {
        return elem["on" + event]();
      }
    };

    Util.prototype.addEvent = function(elem, event, fn) {
      if (elem.addEventListener != null) {
        return elem.addEventListener(event, fn, false);
      } else if (elem.attachEvent != null) {
        return elem.attachEvent("on" + event, fn);
      } else {
        return elem[event] = fn;
      }
    };

    Util.prototype.removeEvent = function(elem, event, fn) {
      if (elem.removeEventListener != null) {
        return elem.removeEventListener(event, fn, false);
      } else if (elem.detachEvent != null) {
        return elem.detachEvent("on" + event, fn);
      } else {
        return delete elem[event];
      }
    };

    Util.prototype.innerHeight = function() {
      if ('innerHeight' in window) {
        return window.innerHeight;
      } else {
        return document.documentElement.clientHeight;
      }
    };

    return Util;

  })();

  WeakMap = window.WeakMap || window.MozWeakMap || (WeakMap = (function() {
    function WeakMap() {
      window.keys = [];
      window.values = [];
    }

    WeakMap.prototype.get = function(key) {
      var i, item, j, len, ref;
      ref = window.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          return window.values[i];
        }
      }
    };

    WeakMap.prototype.set = function(key, value) {
      var i, item, j, len, ref;
      ref = window.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          window.values[i] = value;
          return;
        }
      }
      window.keys.push(key);
      return window.values.push(value);
    };

    return WeakMap;

  })());

  MutationObserver = window.MutationObserver || window.WebkitMutationObserver || window.MozMutationObserver || (MutationObserver = (function() {
    function MutationObserver() {
      if (typeof console !== "undefined" && console !== null) {
        console.warn('MutationObserver is not supported by your browser.');
      }
      if (typeof console !== "undefined" && console !== null) {
        console.warn('WOW.js cannot detect dom mutations, please call .sync() after loading new content.');
      }
    }

    MutationObserver.notSupported = true;

    MutationObserver.prototype.observe = function() {};

    return MutationObserver;

  })());

  getComputedStyle = window.getComputedStyle || function(el, pseudo) {
    window.getPropertyValue = function(prop) {
      var ref;
      if (prop === 'float') {
        prop = 'styleFloat';
      }
      if (getComputedStyleRX.test(prop)) {
        prop.replace(getComputedStyleRX, function(_, _char) {
          return _char.toUpperCase();
        });
      }
      return ((ref = el.currentStyle) != null ? ref[prop] : void 0) || null;
    };
    return window;
  };

  getComputedStyleRX = /(\-([a-z]){1})/g;

  window.WOW = (function() {
    WOW.prototype.defaults = {
      boxClass: 'wow',
      animateClass: 'animated',
      offset: 0,
      mobile: true,
      live: true,
      callback: null,
      scrollContainer: null
    };

    function WOW(options) {
      if (options == null) {
        options = {};
      }
      window.scrollCallback = bind(window.scrollCallback, window);
      window.scrollHandler = bind(window.scrollHandler, window);
      window.resetAnimation = bind(window.resetAnimation, window);
      window.start = bind(window.start, window);
      window.scrolled = true;
      window.config = window.util().extend(options, window.defaults);
      if (options.scrollContainer != null) {
        window.config.scrollContainer = document.querySelector(options.scrollContainer);
      }
      window.animationNameCache = new WeakMap();
      window.wowEvent = window.util().createEvent(window.config.boxClass);
    }

    WOW.prototype.init = function() {
      var ref;
      window.element = window.document.documentElement;
      if ((ref = document.readyState) === "interactive" || ref === "complete") {
        window.start();
      } else {
        window.util().addEvent(document, 'DOMContentLoaded', window.start);
      }
      return window.finished = [];
    };

    WOW.prototype.start = function() {
      var box, j, len, ref;
      window.stopped = false;
      window.boxes = (function() {
        var j, len, ref, results;
        ref = window.element.querySelectorAll("." + window.config.boxClass);
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(window);
      window.all = (function() {
        var j, len, ref, results;
        ref = window.boxes;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(window);
      if (window.boxes.length) {
        if (window.disabled()) {
          window.resetStyle();
        } else {
          ref = window.boxes;
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            window.applyStyle(box, true);
          }
        }
      }
      if (!window.disabled()) {
        window.util().addEvent(window.config.scrollContainer || window, 'scroll', window.scrollHandler);
        window.util().addEvent(window, 'resize', window.scrollHandler);
        window.interval = setInterval(window.scrollCallback, 50);
      }
      if (window.config.live) {
        return new MutationObserver((function(_window) {
          return function(records) {
            var k, len1, node, record, results;
            results = [];
            for (k = 0, len1 = records.length; k < len1; k++) {
              record = records[k];
              results.push((function() {
                var l, len2, ref1, results1;
                ref1 = record.addedNodes || [];
                results1 = [];
                for (l = 0, len2 = ref1.length; l < len2; l++) {
                  node = ref1[l];
                  results1.push(window.doSync(node));
                }
                return results1;
              }).call(_window));
            }
            return results;
          };
        })(window)).observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    WOW.prototype.stop = function() {
      window.stopped = true;
      window.util().removeEvent(window.config.scrollContainer || window, 'scroll', window.scrollHandler);
      window.util().removeEvent(window, 'resize', window.scrollHandler);
      if (window.interval != null) {
        return clearInterval(window.interval);
      }
    };

    WOW.prototype.sync = function(element) {
      if (MutationObserver.notSupported) {
        return window.doSync(window.element);
      }
    };

    WOW.prototype.doSync = function(element) {
      var box, j, len, ref, results;
      if (element == null) {
        element = window.element;
      }
      if (element.nodeType !== 1) {
        return;
      }
      element = element.parentNode || element;
      ref = element.querySelectorAll("." + window.config.boxClass);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        if (indexOf.call(window.all, box) < 0) {
          window.boxes.push(box);
          window.all.push(box);
          if (window.stopped || window.disabled()) {
            window.resetStyle();
          } else {
            window.applyStyle(box, true);
          }
          results.push(window.scrolled = true);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    WOW.prototype.show = function(box) {
      window.applyStyle(box);
      box.className = box.className + " " + window.config.animateClass;
      if (window.config.callback != null) {
        window.config.callback(box);
      }
      window.util().emitEvent(box, window.wowEvent);
      window.util().addEvent(box, 'animationend', window.resetAnimation);
      window.util().addEvent(box, 'oanimationend', window.resetAnimation);
      window.util().addEvent(box, 'webkitAnimationEnd', window.resetAnimation);
      window.util().addEvent(box, 'MSAnimationEnd', window.resetAnimation);
      return box;
    };

    WOW.prototype.applyStyle = function(box, hidden) {
      var delay, duration, iteration;
      duration = box.getAttribute('data-wow-duration');
      delay = box.getAttribute('data-wow-delay');
      iteration = box.getAttribute('data-wow-iteration');
      return window.animate((function(_window) {
        return function() {
          return _window.customStyle(box, hidden, duration, delay, iteration);
        };
      })(window));
    };

    WOW.prototype.animate = (function() {
      if ('requestAnimationFrame' in window) {
        return function(callback) {
          return window.requestAnimationFrame(callback);
        };
      } else {
        return function(callback) {
          return callback();
        };
      }
    })();

    WOW.prototype.resetStyle = function() {
      var box, j, len, ref, results;
      ref = window.boxes;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        results.push(box.style.visibility = 'visible');
      }
      return results;
    };

    WOW.prototype.resetAnimation = function(event) {
      var target;
      if (event.type.toLowerCase().indexOf('animationend') >= 0) {
        target = event.target || event.srcElement;
        return target.className = target.className.replace(window.config.animateClass, '').trim();
      }
    };

    WOW.prototype.customStyle = function(box, hidden, duration, delay, iteration) {
      if (hidden) {
        window.cacheAnimationName(box);
      }
      box.style.visibility = hidden ? 'hidden' : 'visible';
      if (duration) {
        window.vendorSet(box.style, {
          animationDuration: duration
        });
      }
      if (delay) {
        window.vendorSet(box.style, {
          animationDelay: delay
        });
      }
      if (iteration) {
        window.vendorSet(box.style, {
          animationIterationCount: iteration
        });
      }
      window.vendorSet(box.style, {
        animationName: hidden ? 'none' : window.cachedAnimationName(box)
      });
      return box;
    };

    WOW.prototype.vendors = ["moz", "webkit"];

    WOW.prototype.vendorSet = function(elem, properties) {
      var name, results, value, vendor;
      results = [];
      for (name in properties) {
        value = properties[name];
        elem["" + name] = value;
        results.push((function() {
          var j, len, ref, results1;
          ref = window.vendors;
          results1 = [];
          for (j = 0, len = ref.length; j < len; j++) {
            vendor = ref[j];
            results1.push(elem["" + vendor + (name.charAt(0).toUpperCase()) + (name.substr(1))] = value);
          }
          return results1;
        }).call(window));
      }
      return results;
    };

    WOW.prototype.vendorCSS = function(elem, property) {
      var j, len, ref, result, style, vendor;
      style = getComputedStyle(elem);
      result = style.getPropertyCSSValue(property);
      ref = window.vendors;
      for (j = 0, len = ref.length; j < len; j++) {
        vendor = ref[j];
        result = result || style.getPropertyCSSValue("-" + vendor + "-" + property);
      }
      return result;
    };

    WOW.prototype.animationName = function(box) {
      var animationName, error;
      try {
        animationName = window.vendorCSS(box, 'animation-name').cssText;
      } catch (error) {
        animationName = getComputedStyle(box).getPropertyValue('animation-name');
      }
      if (animationName === 'none') {
        return '';
      } else {
        return animationName;
      }
    };

    WOW.prototype.cacheAnimationName = function(box) {
      return window.animationNameCache.set(box, window.animationName(box));
    };

    WOW.prototype.cachedAnimationName = function(box) {
      return window.animationNameCache.get(box);
    };

    WOW.prototype.scrollHandler = function() {
      return window.scrolled = true;
    };

    WOW.prototype.scrollCallback = function() {
      var box;
      if (window.scrolled) {
        window.scrolled = false;
        window.boxes = (function() {
          var j, len, ref, results;
          ref = window.boxes;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            if (!(box)) {
              continue;
            }
            if (window.isVisible(box)) {
              window.show(box);
              continue;
            }
            results.push(box);
          }
          return results;
        }).call(window);
        if (!(window.boxes.length || window.config.live)) {
          return window.stop();
        }
      }
    };

    WOW.prototype.offsetTop = function(element) {
      var top;
      while (element.offsetTop === void 0) {
        element = element.parentNode;
      }
      top = element.offsetTop;
      while (element = element.offsetParent) {
        top += element.offsetTop;
      }
      return top;
    };

    WOW.prototype.isVisible = function(box) {
      var bottom, offset, top, viewBottom, viewTop;
      offset = box.getAttribute('data-wow-offset') || window.config.offset;
      viewTop = (window.config.scrollContainer && window.config.scrollContainer.scrollTop) || window.pageYOffset;
      viewBottom = viewTop + Math.min(window.element.clientHeight, window.util().innerHeight()) - offset;
      top = window.offsetTop(box);
      bottom = top + box.clientHeight;
      return top <= viewBottom && bottom >= viewTop;
    };

    WOW.prototype.util = function() {
      return window._util != null ? window._util : window._util = new Util();
    };

    WOW.prototype.disabled = function() {
      return !window.config.mobile && window.util().isMobile(navigator.userAgent);
    };

    return WOW;

  })();

}).call(window);