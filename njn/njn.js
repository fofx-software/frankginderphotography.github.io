var njn = {};

// utilities:

njn.isArray = function(value) {
  if(Array.isArray) {
    return Array.isArray(value);
  } else {
    return Object.prototype.toString.call(value) === '[object Array]';
  }
}

njn.isBoolean = function(value) {
  return typeof value === 'boolean';
}

njn.isDate = function(value) {
  return value instanceof Date;
}

njn.isDefined = function(value) {
  return typeof value !== 'undefined';
}

njn.isFunction = function(value) {
  return typeof value === 'function';
}

njn.isNull = function(value) {
  return value === null;
}

njn.isNumber = function(value) {
  return typeof value === "number" && value === value;
}

njn.isObject = function(value) {
  if(typeof value !== 'object') return false;
  if(njn.isDate(value)) return false;
  if(njn.isArray(value)) return false;
  if(njn.isNull(value)) return false;
  return true;
}

njn.isRegExp = function(val) {
  return val instanceof RegExp;
}

njn.isString = function(value) {
  return typeof value === 'string';
}

njn.isHTMLElement = function(value) {
  return !!value && njn.isString(value.innerHTML);
}

// need to test with second arg:

njn.typeOf = function(val, testTypes) {
  var type;
// how to handle custom objects?
  if(njn.isArray(val))       type = Array;
  if(njn.isBoolean(val))     type = Boolean;
  if(njn.isDate(val))        type = Date;
  if(!njn.isDefined(val))    type = undefined;
  if(njn.isFunction(val))    type = Function;
  if(njn.isNull(val))        type = null;
  if(njn.isNumber(val))      type = Number;
  if(njn.isObject(val))      type = Object;
  if(njn.isRegExp(val))      type = RegExp;
  if(njn.isString(val))      type = String;
  if(njn.isHTMLElement(val)) type = HTMLElement;

  if(testTypes) {
    if(!njn.isArray(testTypes)) testTypes = [testTypes];
    return testTypes.some(function(testType) {
      return type === testType;
    });
  } else {
    return type;
  }
}

// need to test:

njn.hasProperty = function(obj, propertyName) {
  if(!njn.typeOf(obj, [String, Number, Boolean, undefined, null])) {
    return propertyName in obj;
  } else if(!njn.typeOf(obj, [undefined, null])) {
    var hasOwn = obj.hasOwnProperty(propertyName);
    var inherited = propertyName in obj.constructor.prototype;
    return hasOwn || inherited;
  }
}

// test this:

njn.unCamel = function(string, joiner) {
  return string.split(/(?=[A-Z])/).map(function(substring) {
    return substring.toLowerCase();
  }).join(joiner || '_');
}

njn.isBlank = function(string) {
  var emptyString = string === '';
  var whiteSpace = !!string.match(/^\s+$/);
  return emptyString || whiteSpace;
}

njn.Array = function(listObject) {
  var sliced = Array.prototype.slice.call(listObject || []);
  njn.Array.forEach(['forEach', 'find'], function(fnName) {
    sliced[fnName] = njn.Array[fnName].bind(null, sliced);
  });
  return sliced;
};

njn.Array.find = function(array, fn, thisArg) {
  if(Array.prototype.find) {
    return Array.prototype.find.call(array, fn, thisArg);
  } else {
    for(var i = 0; i < array.length; i++) {
      if(fn.call(thisArg, array[i], i, array)) {
        return array[i];
      }
    }
  }
};

njn.Array.forEach = function(array, fn, thisArg) {
  if(Array.prototype.forEach) {
    Array.prototype.forEach.call(array, fn, thisArg);
  } else {
    for(var i = 0; i < array.length; i++) {
      fn.call(thisArg, array[i], i, array);
    }
  }
}


njn.String = {
  keepSplit: function(str, delim) {
    if('-'.split(/(-)/).length === 3) return str.split(delim);
    var ignoreCase = delim.ignoreCase ? 'i' : '';
    var match = new RegExp(delim.source, 'g' + ignoreCase);
    var matches = str.match(match);
    var allTogether = [];
    str.split(delim).forEach(function(part) {
      if(matches.length) {
        allTogether.push(part, matches.shift());
      } else {
        allTogether.push(part);
      }
    });
    return allTogether;
  },
  camelCase: function(string) {
    var splitString = string.split(/[-_ ]/);
    for(var i = 1; i < splitString.length; i++) {
      var firstLetter = splitString[i].slice(0, 1).toUpperCase();
      splitString[i] = firstLetter + splitString[i].slice(1);
    }
    return splitString.join('');
  }
}

// mock classes:

njn.Object = {
  clone: function(original, deep) {
    if(njn.isArray(original)) {
      return original.slice();
    } else {
      var newObj = Object.create(Object.getPrototypeOf(original));
      Object.keys(original).forEach(function(propertyName) {
        newObj[propertyName] = original[propertyName];
      });
      return newObj;
    }
  },
  isCloneable: function(object) {
    return njn.isObject(object) || njn.isArray(object);
  },
  values: function(object) {
    var values = [];
    for(var property in object) {
      if(object.hasOwnProperty(property) && object.propertyIsEnumerable(property)) {
        values.push(object[property]);
      }
    }
    return values;
  }
}
