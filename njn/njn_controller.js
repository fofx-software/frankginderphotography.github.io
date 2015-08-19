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
  this.registeredControllers[njn.camelCase(controllerName)] = controller;
}
  
njn.Controller = function NJNController() { }

njn.controller = function(controllerName, viewInterface) {
  var controller = new njn.Controller;

  controller.viewInterface = viewInterface || (njn.isObject(controllerName) ? controllerName : {});
  controller.viewInterface.controller = controller;

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
  return this.refreshView();
}

njn.Controller.prototype.refreshView = function() {
  var processed = processHTML(this.template, this.viewInterface);
  var liveElement = document.getElementById(this.name);
  //liveElement.outerHTML = stripBracketsAndTripleBraces(liveElement.outerHTML).replace(/data-njnsrc/g, 'src');
  return document.getElementById(this.name);
}

var interpolatorRE = ['\\{\\{', '[!=]?\\w+(?:\\?|(?:\\+|\\-)[0-9]*)?\\}\\}(?!\\})'];

function processHTML(element, resolveIn, interpolator) {
  interpolator = interpolator || new RegExp(interpolatorRE.join(''), 'g');
  njn.Array(element.attributes).forEach(function(attribute) {
    var processed = processText(attribute.value, resolveIn, interpolator);
    var trueName = attribute.name;
    if(trueName == 'data-njnsrc' && !processed.match(/\{\{/)) {
      trueName = 'src';
    }
    element.setAttribute(trueName, processed);
  });
  njn.Array(element.childNodes).forEach(function(childNode) {
    processNode(childNode, resolveIn, interpolator);
  });
}
  
function processNode(childNode, resolveIn, interpolator) {
  if(childNode.nodeType == 3) {
    var newText = processText(childNode.textContent, resolveIn, interpolator);
    var newNode = document.createTextNode(newText);
    childNode.parentElement.replaceChild(newNode, childNode);
  } else {
    processHTML(childNode, resolveIn, interpolator);
    if(childNode.hasAttribute('data-njnrepeat')) {
      var listName      = childNode.getAttribute('data-njnrepeat');
      var list          = resolveValue(listName, resolveIn);
      var namespacedRE  = new RegExp(interpolatorRE.join(listName + ':'), 'g');
      var parentElement = childNode.parentElement;
      var nextSibling   = childNode.nextSibling;
      parentElement.removeChild(childNode);
      njn.Array(list).forEach(function(listMember) {
        var clone = childNode.cloneNode(true);
        processHTML(clone, listMember, namespacedRE);
        parentElement.insertBefore(clone, nextSibling);
      });
    }
  }
}

//function repeatElements(parentElement, resolveIn, listName) {
//  var selector = '[data-njnrepeat' + (listName ? '^=' + listName : '') + ']';
//  var repeaters = parentElement.querySelectorAll(selector);
//  for(i = 0; i < repeaters.length; i++) {
//    var repeater = repeaters[i];
//    var listNameRegExp = new RegExp('(?:' + listName + ':)?(.+)');
//    var newListName = repeater.getAttribute('data-njnrepeat').match(listNameRegExp)[1];
//    var list = resolveValue(newListName, resolveIn);
//    var html = '';
//    for(var j = 0; j < list.length; j++) {
//      html += processHTML(repeater, list[j], newListName);
//    }
//    repeater.outerHTML = html;
//  }
//}
//
//function processHTML (elementOrHTML, resolveIn, listName) {
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
