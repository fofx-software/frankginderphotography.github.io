var __njn_controller_utilities__ = (function defineNJNController() {

// Object.create to inherit, so njn.registeredControllers' ownProperties are only the added controllers:

njn.registeredControllers = Object.create({
  asArray: function() {
    return(Object.keys(njn.registeredControllers).map(function(controllerName) {
      return njn.registeredControllers[controllerName];
    }));
  },

  watching: function(collection) {
    return(njn.registeredControllers.asArray().filter(function(controller) {
      return controller.watching === collection;
    }));
  },
});

njn.registerController = function(controllerName, controller) {
  this.registeredControllers[njn.String.camelCase(controllerName)] = controller;
}

njn.getData = function(element) {
  var dataset = {};
  njn.Array(element.attributes).forEach(function(attr) {
    if(attr.name.match(/^data-/)) {
      var newName = njn.String.camelCase(attr.name.replace(/^data-/, ''));
      dataset[newName] = attr.value;
    }
  });
  return dataset;
}

njn.addClass = function(element, className) {
  var splitClass = element.className.split(' ');
  if(splitClass.indexOf(className) < 0) {
    element.className = splitClass.concat(className).join(' ');
  }
}

njn.removeClass = function(element, className) {
  var splitClass = element.className.split(' ');
  var indexOf = splitClass.indexOf(className);
  if(indexOf > -1) {
    splitClass.splice(indexOf, 1);
    element.className = splitClass.join(' ');
  }
}
  
njn.Controller = function NJNController() { }

njn.controller = function(controllerName, viewInterface) {
  var controller = new njn.Controller;

  controller.viewInterface = viewInterface || (njn.isObject(controllerName) ? controllerName : {});
  controller.viewInterface.controller = controller;

  var oldUrl = '',
      hashChangeHandlers = njn.Array();

  window.addEventListener('load', function() {
    var handleHashChange = function() {
      hashChangeHandlers.forEach(function(handler) {
        handler(oldUrl);
      });
      oldUrl = location.hash;
    };
    window.addEventListener('hashchange', handleHashChange, false);
    handleHashChange();
  }, false);

  controller.route = function(routeRE, action, noMatch) {
    var checkHash = (function(oldUrl) {
      var oldMatch = oldUrl.match(routeRE);
      var match = location.hash.match(routeRE);
      if(match && (!oldMatch || oldMatch[0] != match[0])) {
        action.call(this, match, oldMatch);
      } else if(oldMatch && !match && noMatch) {
        noMatch.call(this);
      }
    }).bind(this);
    if(arguments.length == 1) {
      njn.Array(arguments[0]).forEach(function(subArray) {
        this.route(subArray[0], subArray[1], subArray[2]);
      }, this);
    } else {
      hashChangeHandlers.push(checkHash);
    }
    return this;
  };

  if(njn.isString(controllerName)) {
    controller.name = controllerName;
    njn.registerController(controllerName, controller);
    var template = document.getElementById(controllerName);
    if(template) controller.loadTemplate(template);
  }

  return controller;
}

njn.Controller.prototype.loadTemplate = function(template) {
  this.template = template;
  this.parentElement = template.parentElement;
  buildView(this.template, this.viewInterface, '', this);
};

njn.createEvent = function(name, options) {
  options = options || { bubbles: false, cancelable: false };
  if(Event) {
    return new Event(name, options);
  } else {
    var event = document.createEvent('Event');
    event.initEvent(name, !!options.bubbles, !!options.cancelable);
    return event;
  }
}

var refresh = njn.createEvent('refresh', { bubbles: true });
var viewChange = njn.createEvent('viewChange', { bubbles: true });

function buildView(element, resolveIn, interpolator, controller) {
  var dataset = njn.getData(element),
      parentElement = element.parentElement,
      nextSibling = element.nextSibling;
  if(dataset.njnrepeat && !element.template) {
    var listName = dataset.njnrepeat;
    var list     = resolveValue(listName, resolveIn);
    parentElement.removeChild(element);
    if(list.length) {
      element.clones = njn.Array();
      njn.Array(list).forEach(function(listMember) {
        var clone = element.cloneNode(true);
        var re    = new RegExp(interpolatorRE.join(listName + ':'), 'g');
        clone.template = element;
        element.clones.push(clone);
        buildView(clone, listMember, re, controller);
        parentElement.insertBefore(clone, nextSibling);
      });
    }
  } else {
    if(!element.template) element.template = element.cloneNode();
    processNode(element, resolveIn, interpolator, controller);
    njn.Array(element.childNodes).forEach(function(child) {
      buildView(child, resolveIn, interpolator, controller);
    });
  }
}

njn.Controller.prototype.refreshView = function() {
  this.liveElement = document.getElementById(this.name);
  var processed = processNode(this.liveElement, this.viewInterface, '', this);
  //liveElement.outerHTML = stripBracketsAndTripleBraces(liveElement.outerHTML).replace(/data-njnsrc/g, 'src');
  return this.liveElement;
};
  
njn.Controller.prototype.addEventListeners = function(events, handler) {
  if(arguments.length > 1) {
    if(njn.isArray(events)) {
      njn.Array(events).forEach(function(event) {
        this.addEventListeners(event, handler);
      }, this);
    } else if(njn.isObject(events)) {
      njn.Array(events.events || [events.event]).forEach(function(event) {
        events.target.addEventListener(event, handler.bind(this), false);
      }, this);
      if(events.callNow) {
        window.addEventListener('load', handler.bind(this), false);
      }
    }
  } else {
    njn.Array(events).forEach(function(subArray) {
      this.addEventListeners(subArray[0], subArray[1]);
    }, this);
  }
  return this;
};
  
njn.Controller.prototype.get = function(query) {
  return query ? this.template.querySelector(query) : this.template;
}

njn.Controller.prototype.all = function(query) {
  return this.template.querySelectorAll(query);
}

var interpolatorRE = ['\\{\\{', '[!=]?\\w+(?:\\?|(?:\\+|\\-)[0-9]*)?\\}\\}(?!\\})'];
  
njn.Controller.prototype.refreshView = function() {
  refreshNode(this.get(), this.viewInterface, '', this);
}

function refreshNode(element, resolveIn, interpolator, controller) {
  if(!element.parentElement) return;
  if(element.template && element.template.clones) {
    var indexOf = element.template.clones.indexOf(element);
    if(element.template.clones[indexOf + 1]) {
      element = element.template;
    }
  }
  if(element.clones) {
    var dataset = njn.getData(element);
    var nextSibling = element.clones.slice(-1)[0].nextSibling,
        parentElement = element.clones[0].parentElement;
    element.clones.forEach(function(clone) {
      parentElement.removeChild(clone);
    });
    var listName = dataset.njnrepeat;
    var list     = resolveValue(listName, resolveIn);
    if(list.length) {
      var re = new RegExp(interpolatorRE.join(listName + ':'), 'g');
      element.clones = njn.Array();
      njn.Array(list).forEach(function(listMember) {
        var clone = element.cloneNode(true);
        element.clones.push(clone);
        parentElement.insertBefore(clone, nextSibling);
        clone.template = element;
        processNode(clone, listMember, re, controller);
        (function processChildren(realParent, cloneParent) {
          njn.Array(realParent.childNodes).forEach(function(realChild, i) {
            var cloneChild = cloneParent.childNodes[i];
            cloneChild.template = realChild;
            processNode(cloneChild, listMember, re, controller);
            if(realChild.childNodes.length) {
              processChildren(realChild, cloneChild);
            }
          });
        })(element, clone);
      });
    }
  } else {
    processNode(element, resolveIn, interpolator, controller);
    njn.Array(element.childNodes).forEach(function(child) {
      refreshNode(child, resolveIn, interpolator, controller);
    });
  }
  element.dispatchEvent(refresh);
  element.dispatchEvent(viewChange);
}

function processNode(element, resolveIn, interpolator, controller) {
  var standardRE = new RegExp(interpolatorRE.join(''), 'g');
  if(element.nodeType == 3) {
    var oldText = element.textContent;
    element.textContent = processText(element.textContent, controller.viewInterface, standardRE);
    element.textContent = processText(element.textContent, resolveIn, interpolator || standardRE);
  } else {
    showByRoute(element, resolveIn, interpolator, controller);
    njn.Array(element.template.attributes).forEach(function(attribute) {
      var processed = processText(attribute.value, controller.viewInterface, standardRE);
      processed = processText(processed, resolveIn, interpolator || standardRE);
      var trueName = attribute.name;
      if(trueName == 'data-njnsrc' && !processed.match(/\{\{/)) trueName = 'src';
      element.setAttribute(trueName, processed);
    });
  }
}

var alreadyAdded = [];

function showByRoute(element, resolveIn, interpolator, controller) {
  var showAttr = element.getAttribute('data-njnshow'),
      hideAttr = element.getAttribute('data-njnhide'),
      routeName = showAttr || hideAttr;
  if(routeName) {
    element.style.display =
      showAttr && location.hash != routeName ? 'none' :
      hideAttr && location.hash == routeName ? 'none' :
      '';
    if(alreadyAdded.indexOf(element) == -1) {
      controller.route(
        /./,
        function() {
          var origDisplay = element.style.display;
          if(location.hash === routeName) {
            element.style.display = (showAttr ? '' : 'none');
          } else {
            element.style.display = (hideAttr ? '' : 'none');
          }
          element.dispatchEvent(viewChange);
        }
      );
      alreadyAdded.push(element);
    }
  }
  return !!element.style.display;
}

//function processNode (elementOrHTML, resolveIn, listName) {
//  var html = '';
//  html = elementOrHTML.outerHTML || elementOrHTML;
//  var interpolator = new RegExp(interpolatorRE.join(listName ? listName + ':' : ''), 'g');
//  while(html.search(interpolator) > -1) {
//    html = processText(html, resolveIn, interpolator);
//  }
//  // if any [[]] were in the original html but no {{}}, make sure the [[]] are processed:
//  return processText(html, resolveIn, interpolator);;
//}

var escapeHTMLRE = /\[\[([^\]]|\n)+\]\]/g;

function processText(text, resolveIn, interpolator) {
  return text.replace(interpolator, function(match) {
    var innerMatch = match.match(/\{\{(?:\w+:)?((?:[^\}]|\}(?!\}))+)\}\}/)[1];
    var negate = /^!/.test(innerMatch);
    var incr = innerMatch.match(/\+([0-9]*)$/);
    var decr = innerMatch.match(/\-([0-9]*)$/);
    var propertyName = innerMatch.match(/\w+\??/)[0];
    var replacement = resolveValue(propertyName, resolveIn);
    replacement =
      incr ? replacement + (+incr[1] || 1) :
      decr ? replacement - (+decr[1] || 1) :
      replacement;
    if(njn.isDefined(replacement)) {
      if(negate) { replacement = !replacement; }
      if(njn.isHTMLElement(replacement)) {
        replacement = replacement.outerHTML;
      }
      return replacement;
    } else {
      // need to bring back escaping for this to make sense:
      return match + '}';
    }
  })//.replace(escapeHTMLRE, function(match) {
  //  return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  //});
}

function resolveValue(propertyName, resolveIn) {
  var splitProperty = propertyName.split('.');
  var firstProperty = splitProperty.shift();
  if(njn.hasProperty(resolveIn, firstProperty)) {
    var value = resolveIn[firstProperty];
    value = value.call ? value.call(resolveIn) : value;
    while(splitProperty.length) {
      subValue = value[splitProperty.shift()];
      value = subValue.call ? subValue.call(value) : subValue;
    }
    return value;
  }
}

function stripBracketsAndTripleBraces(html) {
  return html.replace(/\[?\[\[|\]?\]\]/g, function(match) {
    return match.length === 3 ? match.slice(0,2) : '';
  }).replace(/\{\{\{/g, '{{').replace(/\}\}\}/g, '}}');
}

if(window['testing'])
  return {
    interpolatorRE: interpolatorRE,
    escapeHTMLRE: escapeHTMLRE,
    resolveValue: resolveValue,
    processText: processText,
    stripBracketsAndTripleBraces: stripBracketsAndTripleBraces
  };

})();
