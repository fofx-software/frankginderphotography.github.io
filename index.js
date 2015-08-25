"use strict";

// break up number of photos on server into groups of 24, returning
// strings like: '1-24', '25-48', etc. If small screen, groups of 12
// instead to decrease loading time:

var indexRanges = [],
    groupsOf = window.innerWidth < 709 ? 11 : 23;

// will reuse rangeEnd and rangeStart below, so isolate them in a function scope here:
(function() {
  for(var rangeEnd = 1, rangeStart = 1; rangeEnd <= registeredPhotos.length; rangeEnd++) {
    if(rangeEnd - rangeStart == groupsOf || rangeEnd == registeredPhotos.length) {
      indexRanges.push(rangeStart + '-' + rangeEnd);
      rangeStart = rangeEnd + 1;
    }
  }
})();

// populate links for the above indexRanges:
njn.controller('sidebar', { indexRanges: indexRanges });

var indexRange = function() {
  return (location.hash.match(/[0-9]+-[0-9]+/) || indexRanges)[0];
}

var rangeStart = function() { return +indexRange().split('-')[0]; }
var rangeEnd   = function() { return +indexRange().split('-')[1]; }

var photosInRange = function() {
  var photos = [];
  for(var i = rangeStart(); i <= rangeEnd(); i++) {
    var photoName = registeredPhotos[i - 1];
    photos.push({
      src:       'photos/' + photoName + '.jpg',
      href:      '#/' + indexRange() + '/' + i,
      thumbnail: 'photos/thumbnails/' + photoName + '.png',
      photoInd:  i
    });
  }

  return photos;
}
  
var thumbnailGallery = njn.controller('thumbnail-gallery', {
  photos: photosInRange
}).route(/[0-9]+-[0-9]+/, function() {
  this.refreshView();
});

///////////////
// showcases //
///////////////

var positionedShowcases = {
  forEach: function(callback) {
    njn.Array(['left', 'center', 'right']).forEach(function(pos, i) {
      if(this[pos]) callback(this[pos], i);
    }, this);
  },
  set: function(position, showcase) {
    if(this[position]) {
      this[position].className = 'showcase';
    }
    showcase.photoNum = Number(showcase.getAttribute('data-photoind'));
    njn.addClass(showcase, position);
    this[position] = showcase;
  }
};

var showcases = njn.controller('showcases', {
  photos: photosInRange,
  indexRange: indexRange
}).route([
  [
    /[0-9]+-[0-9]+/, function() {
      this.refreshView();
    }
  ],
  [
    /\/([0-9]+)$/,
    function(match) {
      var photoInd = +match[1];
      if(!this.get().style.display) {
        njn.Array(thumbnailGallery.all('.thumbnail-grid-square')).forEach(function(gridSquare) {
          njn.addClass(gridSquare, 'no-hover');
        });
        loadShowcase(photoInd);
      } else {
        var diff = photoInd - positionedShowcases.center.photoNum;
        slideShowcase(diff == -1 ? 'left' : 'right');
      }
    },
    function() {
      njn.Array(thumbnailGallery.all('.thumbnail-grid-square')).forEach(function(gridSquare) {
        njn.removeClass(gridSquare, 'no-hover');
      });
      unloadShowcase();
    }
  ]
]);

function loadShowcase(photoInd) {
  for(var i = -1, currInd = photoInd + i; i < 2; currInd = photoInd + ++i) {
    var showcase = showcases.get('[data-photoind="' + currInd + '"]');
    if(i == -1 && showcase) positionedShowcases.set('left', showcase);
    if(i == 0) positionedShowcases.set('center', showcase);
    if(i == 1 && showcase) positionedShowcases.set('right', showcase);
  }
  setHrefs();
  transformPositionedShowcases();
  loadAhead(photoInd);
  showcases.get().style.display = 'block';
}

function unloadShowcase() {
  positionedShowcases.forEach(function(showcase) { setTransform(showcase); });
  showcases.get().style.display = '';
}

function loadAhead(photoInd) {
  for(var i = 0, diffs = [0, 1, -1, 2, -2]; i < 5; i++) {
    var currInd = photoInd + diffs[i];
    var showcase = showcases.get('[data-photoind="' + currInd + '"]');
    if(showcase) {
      showcase.getElementsByTagName('img')[0].src = 'photos/' + registeredPhotos[currInd - 1] + '.jpg';
    }
  }
}

function slideShowcase(goDir) {
  var oppDir = goDir == 'left' ? 'right' : 'left';

  if(positionedShowcases[oppDir]) {
    clearTransition(positionedShowcases[oppDir]);
    setTransform(positionedShowcases[oppDir]);
  }

  positionedShowcases.set(oppDir, positionedShowcases.center);
  setTransitionWithEnd(positionedShowcases[oppDir]);
  positionedShowcases.center = undefined;

  if(positionedShowcases[goDir]) {
    positionedShowcases.set('center', positionedShowcases[goDir]);
    setTransitionWithEnd(positionedShowcases.center);
    positionedShowcases[goDir] = undefined;
  }

  var upOrDown = goDir == 'left' ? -2 : 2;
  var newNextPhotoId = positionedShowcases[oppDir].photoNum + upOrDown;
  var newNextPhoto = showcases.get('[data-photoind="' + newNextPhotoId + '"]');
  if(newNextPhoto) positionedShowcases.set(goDir, newNextPhoto);

  if(positionedShowcases.center) {
    transformPositionedShowcases();
    loadAhead(+positionedShowcases.center.getAttribute('data-photoind') - 1);
  }
}

function setHrefs() {
  var photoInd = positionedShowcases.center.photoNum,
      prevPhoto = photoInd - 1, nextPhoto = photoInd + 1,
      prevRange, nextRange;
  if(prevPhoto < rangeStart()) {
    prevPhoto = prevPhoto || registeredPhotos.length;
    prevRange = Math.max(prevPhoto - groupsOf, 1) + '-' + prevPhoto;
  }
  if(nextPhoto > rangeEnd()) {
    nextPhoto = nextPhoto % registeredPhotos.length || registeredPhotos.length;
    nextRange = nextPhoto + '-' + Math.min(nextPhoto + groupsOf, registeredPhotos.length);
  }
  showcases.get('#left-click').href = '#/' + (prevRange || indexRange()) + '/' + prevPhoto;
  showcases.get('#right-click').href = '#/' + (nextRange || indexRange()) + '/' + nextPhoto;
}

function transformPositionedShowcases(pctOffset, y) {
  positionedShowcases.forEach(function(showcase, i) {
    var translateFunction = 'translate(' + (i * 100 + (pctOffset || 0)) + '%, ' + (y || 0) + '%)';
    if(showcase) {
      setTransform(showcase, translateFunction);
    }
  });
}

function setTransform(element, translateFunction) {
  element.style.webkitTransform = translateFunction || 'none';
  element.style.mozTransform    = translateFunction || 'none';
  element.style.msTransform     = translateFunction || 'none';
  element.style.oTransform      = translateFunction || 'none';
  element.style.transform       = translateFunction || 'none';
}

var globalTransition = '400ms linear',
    inTransition;

function setTransitionWithEnd(element, callback) {
  if(!element) { return; }
  njn.Array.forEach(
    ['transitionend', 'webkitTransitionEnd', 'oTransitionEnd', 'otransitionend'],
    function(transitionName) {
      element.addEventListener(transitionName, function transitionEnd() {
        if(njn.isFunction(callback)) {
          callback(element);
        } else {
          clearTransition(element);
          // reset globalTransition in case it was changed ontouchend:
          globalTransition = '400ms linear';
          setHrefs();
          inTransition = false;
        }
        element.removeEventListener(transitionName, transitionEnd, false);
      }, false);
      setTransition(element, globalTransition);
      inTransition = true;
    }
  );
}

function setTransition(element, transition) {
  element.style.webkitTransition = '-webkit-transform ' + transition;
     element.style.mozTransition =    '-moz-transform ' + transition;
      element.style.msTransition =     '-ms-transform ' + transition;
       element.style.oTransition =      '-o-transform ' + transition;
        element.style.transition =         'transform ' + transition;
}

function clearTransition(element) {
  element.style.webkitTransition = 'none';
  element.style.mozTransition    = 'none';
  element.style.msTransition     = 'none';
  element.style.oTransition      = 'none';
  element.style.transition       = 'none';
}

///////////////////
// end showcases //
///////////////////

///////////////
// scrollbar //
///////////////

var scrollbar = njn.controller('scrollbar')
  .addEventListeners(
    [
      { target: window, event: 'resize', callNow: true },
      { target: thumbnailGallery.get(), event: 'viewChange' }
    ],
    function() {
      var scroller = this.get('div');
      var heightRatio = Math.round(thumbnailGallery.get().clientHeight / thumbnailGallery.get().scrollHeight * 100);
      if(heightRatio < 100) {
        this.get().style.display = '';
        scroller.style.height = heightRatio + '%';
        scroller.style.top = Math.round(thumbnailGallery.get().scrollTop / thumbnailGallery.get().scrollHeight * 100) + '%';
      } else {
        this.get().style.display = 'none';
      }
    }
  );

thumbnailGallery.get().addEventListener('scroll', function() {
  var topPct = Math.round(thumbnailGallery.get().scrollTop / thumbnailGallery.get().scrollHeight * 100);
  scrollbar.get('div').style.top = topPct + '%';
}, false);

scrollbar.get('div').addEventListener('mousedown', function(e) {
  var startY = e.pageY,
      startScroll = thumbnailGallery.get().scrollTop;
  window.addEventListener('mousemove', function handleMove(e2) {
    e2.preventDefault();
    scrollbar.get('div').className = 'hovered';
    var scrolledRatio = (e2.pageY - startY) / scrollbar.get().clientHeight;
    thumbnailGallery.get().scrollTop = startScroll + scrolledRatio * thumbnailGallery.get().scrollHeight;
    window.addEventListener('mouseup', function handleUp() {
      window.removeEventListener('mousemove', handleMove, false);
      window.removeEventListener('mouseup', handleUp, false);
      scrollbar.get('div').className = '';
    });
  });
}, false);

///////////////////
// end scrollbar //
///////////////////
//var photoInd = location.hash.match(/\/([0-9]+)$/);
//if(photoInd && photoInd[1]) loadShowcase(+photoInd[1]);

//(window.onhashchange = function() {
//  // on clicking one of the group links, the index range part of the
//  // hash is changes, so load the new group:
//  var newRange = location.hash.match(/[0-9]+-[0-9]+/);
//  if(newRange && newRange[0] !== indexRange) {
//    location.reload();
//  } else if(location.hash.match(/contact/)) {
//    indexRange = '';
//    document.getElementById('hide-scrollbar').innerHTML =
//      '<img class="selfp" src="photos/selfp.jpg">' +
//      '<b class="email">fginder@hotmail.com</b>';
//    scroller.style.display = 'none';
//  } else {
//    var photoInd = location.hash.match(/\/([0-9]+)$/);
//    if(photoInd && photoInd[1]) {
//      var isShown = positionedShowcases.center &&
//        photoInd[1] == positionedShowcases.center.getAttribute('data-photoind');
//      if(showcases.style.display != 'block' || !isShown) {
//        loadShowcase(+photoInd[1]);
//      }
//    } else {
//      // if a fullsized image was clicked, the photo_id part of the hash
//      // was removed, so hide #showcases:
//      clearTransform();
//      showcases.style.display = 'none';
//      var noHover = document.getElementsByClassName('thumbnail-grid-square-no-hover');
//      (noHover[0] || noHover).className = 'thumbnail-grid-square';
//    }
//  }
//})();

var whichKey = function(e) {
  return e.key || {
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown'
  }[e.which] || '';
}

function navigatePhotos(direction) {
  if(showcases.style.display === 'block') {
    var click = new MouseEvent('click', { bubbles: true });
    document.getElementById(direction.toLowerCase() + '-click').dispatchEvent(click);
  }
}

function scrollThumbnails(direction) {
  if(showcases.style.display !== 'block') {
    photoGallery.scrollTop += (direction === 'Up' ? -75 : 75);
  }
}

window.addEventListener('keydown', function(e) {
  var match;
  if(match = whichKey(e).match(/Left|Right/)) {
    navigatePhotos(match[0]);
  } else if(match = whichKey(e).match(/Up|Down/)) {
    scrollThumbnails(match[0]);
  }
}, false);

var firstTouch = {};

//showcases.addEventListener('touchstart', function(e) {
//  if(e.touches.length == 1) {
//    var isNavClick = e.target.id.match(/left|right/);
//    var currTouch = e.changedTouches[0];
//    if(!inTransition && !isNavClick) {
//      // positionedShowcases.forEach(clearTransition);
//      // iOS safari reuses touch objects across events, so store properties in separate object:
//      firstTouch.screenX = currTouch.screenX;
//      firstTouch.screenY = currTouch.screenY;
//      firstTouch.time = Date.now();
//    } else if(inTransition) {
//      firstTouch.inTransition = true;
//    } else if(isNavClick) {
//      firstTouch.isNavClick = true;
//    }
//  } else {
//    firstTouch.multi = true;
//    e.preventDefault();
//  }
//}, false);
//
//showcases.addEventListener('touchmove', function(e) {
//  e.preventDefault();
//  if(e.touches.length == 1 && !firstTouch.multi) {
//    var currTouch = e.changedTouches[0];
//    if(!firstTouch.inTransition && !firstTouch.isNavClick) {
//      var deltaX = currTouch.screenX - firstTouch.screenX,
//          deltaY = currTouch.screenY - firstTouch.screenY;
//      if(!firstTouch.hasOwnProperty('isVertical')) {
//        firstTouch.isVertical = Math.abs(deltaY) > Math.abs(deltaX);
//      }
//      if(firstTouch.isVertical) {
//        var heightRatio = deltaY / window.innerHeight * 100;
//        transformPositionedShowcases(0, heightRatio);
//      } else {
//        var widthRatio = deltaX / window.innerWidth * 100;
//        transformPositionedShowcases(widthRatio);
//      }
//    }
//  }
//}, false);
//
//showcases.addEventListener('touchend', function(e) {
//  if(e.changedTouches.length == 1 && !firstTouch.multi && !firstTouch.inTransition && !firstTouch.isNavClick) {
//    var currTouch = e.changedTouches[0];
//    var deltaX = currTouch.screenX - firstTouch.screenX,
//        deltaY = currTouch.screenY - firstTouch.screenY;
//    var quickSwipe = Date.now() - firstTouch.time < 250;
//    if(firstTouch.isVertical && deltaY) {
//      var halfScreenY = Math.abs(deltaY) > window.innerHeight / 2;
//      var exitSwipe = halfScreenY || (quickSwipe && Math.abs(deltaY) > 20);
//      if(exitSwipe) {
//        var yToGo = deltaY < 0 ? currTouch.clientY : window.innerHeight - currTouch.clientY;
//        if(yToGo < 1) yToGo = 1;
//        globalTransition = Math.round(yToGo / window.innerHeight * 800) + 'ms linear';
//        positionedShowcases.forEach(setTransitionWithEnd);
//        setTransitionWithEnd(positionedShowcases.center, function() {
//          var click = new MouseEvent('click', { bubbles: true });
//          showcases.getElementsByClassName('showcase')[0].dispatchEvent(click);
//        });
//        transformPositionedShowcases(0, deltaY > 0 ? 100 : -100);
//      } else {
//        globalTransition = Math.round(Math.abs(deltaY) / window.innerHeight * 400) + 'ms linear';
//        positionedShowcases.forEach(setTransitionWithEnd);
//        transformPositionedShowcases();
//      }
//    } else if(deltaX) {
//      var halfScreenX = Math.abs(deltaX) > window.innerWidth / 2;
//      var navSwipe = halfScreenX || (quickSwipe && Math.abs(deltaX) > 20);
//      if(navSwipe) {
//        globalTransition = Math.round((window.innerWidth - Math.abs(deltaX)) / window.innerWidth * 400) + 'ms linear';
//        navigatePhotos(deltaX > 0 ? 'left' : 'right');
//      } else {
//        globalTransition = Math.round(Math.abs(deltaX) / window.innerWidth * 400) + 'ms linear';
//        positionedShowcases.forEach(setTransitionWithEnd);
//        transformPositionedShowcases();
//      }
//    }
//  } else if(!firstTouch.isNavClick) {
//    e.preventDefault();
//  }
//  firstTouch = {};
//}, false);
//
//showcases.addEventListener('touchcancel', function(e) {
//  firstTouch = {};
//}, false);

//(window.onresize = function() {
//  var heightRatio = Math.round(photoGallery.clientHeight / photoGallery.scrollHeight * 100);
//  if(heightRatio < 100) {
//    scroller.style.height = heightRatio + '%';
//    scroller.style.top = Math.round(photoGallery.scrollTop / photoGallery.scrollHeight * 100) + '%';
//  } else {
//    scroller.style.display = 'none';
//  }
//})();

var sidebarContent = document.getElementById('sidebar-content');
var tm = document.getElementById('tm');

sidebarContent.addEventListener('click', function(e) {
  if(e.target.tagName == 'A') {
    topbar.dispatchEvent(new MouseEvent('click'));
  }
}, false);

document.getElementById('topbar').addEventListener('click', function showContent() {
  sidebarContent.style.maxHeight = window.innerHeight - 45 - tm.clientHeight + 'px';
  njn.Array.forEach(this.getElementsByClassName('arrow'), function(span) {
    span.innerHTML = "&#9652;"
  });
  setTransform(sidebarContent.parentElement, 'translateY(0px)');
  this.removeEventListener('click', showContent, false);
  var hideContent = (function() {
    setTransform(sidebarContent.parentElement, '');
    njn.Array.forEach(this.getElementsByClassName('arrow'), function(span) {
      span.innerHTML = "&#9662;"
    });
    this.removeEventListener('click', hideContent, false);
    this.addEventListener('click', showContent, false);
  }).bind(this);
  this.addEventListener('click', hideContent, false);
}, false);

window.addEventListener('resize', function() {
  sidebarContent.style.maxHeight = window.innerHeight - 45 - tm.clientHeight + 'px';
}, false);

// hack from https://docs.google.com/document/d/12Ay4s3NWake8Qd6xQeGiYimGJ_gCe0UMDZKwP9Ni4m8
// to prevent pull-to-refresh in mobile chrome:

var lastTouchY,
    startFromZero = false;

document.addEventListener('touchstart', function(e) {
  if (e.touches.length != 1) return;
  lastTouchY = e.touches[0].clientY;
  startFromZero = window.pageYOffset == 0;
}, false);

document.addEventListener('touchmove', function(e) {
  var touchY = e.touches[0].clientY;
  var touchYDelta = touchY - lastTouchY;
  lastTouchY = touchY;

  if (startFromZero && touchYDelta > 0) {
    startFromZero = false;
    e.preventDefault();
    return;
  }
}, false);
