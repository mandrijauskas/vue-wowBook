/* eslint-disable */
/*
 * @name wowBook
 *
 * @author Marcio Aguiar
 * @version 1.3.1
 * @requires jQuery v1.7.0+
 *
 * Copyright 2010 Marcio Aguiar. All rights reserved.
 *
 * To use this file you must to buy a license at http://codecanyon.net/user/maguiar01/portfolio
 *
 */
import jQuery from 'jquery'
import $ from 'jquery'
import 'jquery-ui'
import 'hammerjs'

// import Modernizr from 'modernizr'

jQuery.browser = {};
(function () {
    jQuery.browser.msie = false;
    jQuery.browser.version = 0;
    if (navigator.userAgent.match(/MSIE ([0-9]+)\./)) {
        jQuery.browser.msie = true;
        jQuery.browser.version = RegExp.$1;
    }
})()
;(function($) {

$.wowBook = function(elem){
    return $(elem).data("wowBook");
};

$.wowBook.version = "1.3.1";
$.wowBook.support = {};

$.fn.wowBook = function(options) {
  if (typeof options==="string") {
    var args = Array.prototype.slice.call( arguments, 1 );
    if (options==="options" || options==="prop") {
      var instance = $.wowBook(this[0]), attr=args[0];
      return args.length>1 ?
        instance[attr] = args[1]
        : instance[attr];
    }
    return this.each(function() {
      var instance = $.wowBook(this),
          what = instance[options];
      what.apply(instance, args);
    });
  }
  var opts = $.extend({}, $.wowBook.defaults, options);
  return this.each(function() {
    if ( $.wowBook(this) ) {
      console.log("Error: the following element cannot be used twice by wowBook plugin: ",this);
      return
    }
    var book  = new wowBook(this, opts);
    $(this).data('wowBook', book);
  });
}; // fn.wowBook


//
// Book constructor
//
// params:
//  elem - the DOM element that contains the book pages
//  opts - configuration options
//
function wowBook(elem, opts) {
  elem = $(elem);
  var book = this;
  this.elem   = elem;
  this.id     = elem.attr('id');
  this.pages  = [];
  this.opts   = opts;
  this.currentPage = null;
  this.pageWidth   = opts.width/2;
  this.pageHeight  = opts.height;
  this.startPage   = opts.startPage;
  this.onShowPage  = opts.onShowPage;
  this.slideShow   = opts.slideShow;
  this.slideShowDelay   = opts.slideShowDelay;
  this.pauseOnHover     = opts.pauseOnHover;
  this.turnPageDuration = opts.turnPageDuration;
  this.foldGradient     = opts.foldGradient;
  this.foldGradientThreshold = opts.foldGradientThreshold;
  this.shadows          = opts.shadows;
  this.shadowThreshold   = opts.shadowThreshold;
  this.clipBoundaries   = opts.clipBoundaries;
  this.zoomLevel        = 1;
  this.zoomMax          = Math.max(opts.zoomMax, 1);
  this.zoomMin          = opts.zoomMin;
  this.zoomBoundingBox  = opts.zoomBoundingBox;
  this.zoomStep         = opts.zoomStep;
  this.onZoom           = opts.onZoom;
  this.mouseWheel       = opts.mouseWheel;
  this.flipSound        = opts.flipSound;
  this.centeredWhenClosed = opts.centeredWhenClosed;
  this.sectionDefinition = opts.sections;
  this.rtl              = !!opts.rtl;
  this.closable         = opts.closable;
  $.wowBook.support.filters = 'filters' in elem[0];

  // backward compatibility
  if ( this.opts.toolbarContainerPosition ) this.opts.toolbarPosition = this.opts.toolbarContainerPosition;
  if ( this.opts.toolbarLightboxPosition ) this.opts.toolbarPosition = this.opts.toolbarLightboxPosition;

  this._isMobile = $.wowBook.utils.isMobile();
  if (this._isMobile) this.mobileSetup();

  // setup element css
  elem.addClass('wowbook');
  if (elem.css('position')==='static') elem.css('position', 'relative');

  var pages = elem.children();
  if ( pages.length < opts.pageCount ) {
    var i = opts.pageCount-pages.length;
    while(i--){ elem.append("<div />"); }
    pages = elem.children();
  }

  // page Container
  var container =
  this.pagesContainer =
  this.origin = $("<div class='wowbook-origin'></div>").css({
    position : 'absolute'
  }).appendTo(elem);

  // Book Shadow element
  book.bookShadow = $("<div class='wowbook-book-shadow'></div>").appendTo(elem)
    .css({ top:0, position: 'absolute', display: 'none', zIndex: 0 });

  // Turns elements into controls
  this._controls={};
  this.controllify(this.opts.controls);

  // find and Add pages
  this.insertPages(pages, true);

  //
  // create shadows and gradients
  //
  container.append("<div class='wowbook-shadow-clipper'><div class='wowbook-shadow-container'><div class='wowbook-shadow-internal'></div></div></div>");
  book.shadowContainer = $(".wowbook-shadow-container", container);
  book.internalShadow = $(".wowbook-shadow-internal", container);
  book.shadowClipper = $(".wowbook-shadow-clipper", container).css({ display:'none' });
  book.foldShadow = $("<div class='wowbook-shadow-fold'></div>").appendTo(book.shadowContainer);
  book.foldGradientContainer = $("<div class='wowbook-fold-gradient-container'></div>").appendTo(book.shadowContainer);
  book.foldGradientElem  = $("<div class='wowbook-fold-gradient'></div>").appendTo(book.foldGradientContainer);
  book.hardPageDropShadow = $("<div class='wowbook-hard-page-dropshadow'></div>")
    .css({ display: 'none' })
    .appendTo(container);
  if (!$.support.opacity && $.wowBook.support.filters) {
    $.wowBook.applyAlphaImageLoader(["wowbook-fold-gradient", "wowbook-fold-gradient-flipped", "wowbook-shadow-fold", "wowbook-shadow-fold-flipped"]);
  }
  // for IE : without this the child elements (shadows) inside the container ignores the parent's opacity
  book.shadowContainer.css('position', 'relative');

    // create handles over the book
  this.leftHandle  = $("<div class='wowbook-handle wowbook-left'></div>")
    .data('corner', 'l').appendTo(container);
  this.rightHandle = $("<div class='wowbook-handle wowbook-right'></div>")
    .data('corner', 'r').appendTo(container);

  // Mac's Safari 4 (probably until 5.0.5) does not accepts transform perspective with unit
  if (Modernizr.csstransforms3d){
    var dummy = $("<div>").css('transform', 'perspective(1px)')
    this.perspectiveUnit = (dummy.css('transform')!="none") ? "px" : ""
    dummy = null
  }


  // in IE, the z-index of the empty transparent divs used to
  // define the handles are ignored if any other element is on front of them
  // the OMG-I-HATE-IE solution is to make them no-transparent, but opacity=1
  if ($.browser.msie)
    $('.wowbook-handle', elem).css({
      backgroundColor: '#fff',
      opacity: '0.01'
    })

  // drag a handle, hold page
  $('.wowbook-handle', container).bind('mousedown.wowbook', function(e){ return book.pageEdgeDragStart(e) });

  // Curl page corner on hover
  if (opts.curl) {
    $('.wowbook-handle', container).hover(function(e){
      if (book.curlTimer) return;
      book.curlTimer = setTimeout(function(){
        var page = (e.target==book.leftHandle[0]) ? book.leftPage() : book.rightPage();
        if (!page) return;
        var offset = page.offset(),
            y = e.pageY - offset.top;
        book.curl(page, y>book.pageHeight*book.currentScale*book._cssZoom/2 );
      }, 120 );
    }, function(){
      book.curlTimer = clearTimeout( book.curlTimer )
      book.uncurl()
    });
  }

  // short-click a handle, turn page
  var mousedownAt, corner;
  $('.wowbook-handle', container)
    .on("mousedown.wowbook", function(){ mousedownAt = $.now(); corner=$(this).data('corner'); })
    .on("mouseup.wowbook", function(){
      var g = $(this).data('corner');
      var clickDuration = new Date().getTime()-mousedownAt;
      if (clickDuration>book.opts.handleClickDuration || g!=corner) return;
      if (!book._cantStopAnimation) book.stopAnimation(false);
      if (g==='r') book[book.rtl ? "back" : "advance"]();
      if (g==='l') book[book.rtl ? "advance" : "back"]();
      corner="";
    });

  //  slideshow pauseOnHover
  var slideShowRunning = false;
  elem.hover(function(e){
    if (!book.pauseOnHover) return;
    slideShowRunning = book.slideShowTimer;
    book.stopSlideShow( true );
  }, function(){
    if (!book.pauseOnHover) return;
    if (slideShowRunning) book.startSlideShow();
  });

  // Clip Boundaries
  if (this.clipBoundaries) {
    this.origin.wrap("<div class='wowbook-clipper'><div class='wowbook-inner-clipper'></div></div>")
    $(".wowbook-inner-clipper", elem).css({
      position : 'absolute',
      width    : '100%',
      overflow : 'hidden'
    });
    this.clipper = $(".wowbook-clipper", elem).css({
      position: 'absolute', left:0, top:0, width:'100%',
      overflow: 'hidden', zIndex: 1
    });
  }


  // Zoom
  elem.wrapInner("<div class='wowbook-zoomwindow'><div class='wowbook-zoomcontent'></div></div>");
  this.zoomWindow  = $('.wowbook-zoomwindow', elem);
  this.zoomContent = $('.wowbook-zoomcontent', elem);
  if ($.browser.ie8mode) this.zoomContent.wrapInner("<div class='IE8-zoom-helper'style='position:relative'></div>");
  this.zoomWindow.css({
    position : 'absolute',
    top      : 0
  });
  this.zoomContent.css({
    position : 'absolute',
    left     : 0,
    top      : 0
  });
  this.zoomSetup();


  this.setDimensions( opts.coverWidth*2 || opts.width, opts.coverHeight || opts.height );

  if (this.opts.container) this.createContainer();

  this.singlePage( opts.singlePage );
  if ( opts.responsiveSinglePage ) {
    this.responsiveSinglePage();
  }
  if ( opts.scaleToFit ) {
    this.scaleToFit();
    this.responsive();
  }

  this.fillToc();

  // Use translate3d ?
  var useTranslate3d = opts.useTranslate3d;
  if (Modernizr.csstransforms3d && useTranslate3d){
    $.wowBook.useTranslate3d = (useTranslate3d == true) ||
                              ((useTranslate3d == 'mobile') && $.wowBook.utils.isMobile());
  }
  opts.useScale3d = opts.useScale3d && Modernizr.csstransforms3d;


  // deep linking
  if (opts.deepLinking && this.getLocationHash()) {
    var page;
    try { page = book.selectorToPage('#'+this.getLocationHash()); } catch(e){}
    if (page===undefined) page=book.locationHashToPage();
    if (typeof(page)==='number') {
      book.startPage = page;
      if (opts.moveToViewPort && !isInViewPort(book.elem)) book.elem[0].scrollIntoView();
    }
  }

  // Page flipping sound
  if (this.flipSound) this.audio = this.createAudioPlayer();

  // Keyboard navigation
  if (this.opts.keyboardNavigation) {
    var defKeyNav = $.wowBook.defaults.keyboardNavigation;
    if (this.rtl && this.opts.keyboardNavigation==defKeyNav) {
      this.opts.keyboardNavigation = { back: defKeyNav.advance, advance: defKeyNav.back };
    }
    $(document).on("keydown.wowbook", function(e){
      // ignore when typing in a input element
      if ($(e.target).filter('input, textarea, select').length) return;
      if (book.holdedPage) return;
      if (e.which===book.opts.keyboardNavigation.back) book.back();
      if (e.which===book.opts.keyboardNavigation.advance) book.advance();
    });
  }

  $(window).on("hashchange.wowbook",function(){
    var locationHash = window.location.hash;
    if (locationHash===book.locationHashSetTo) {
      book.locationHashSetTo = undefined;
      return;
    }
    // true if location.hash is empty and does not have even a "#" sign
    var emptyHash = (locationHash==='' && !book.locationEndsInHash());
    var page = emptyHash ? book.startPage : book.locationHashToPage();
    if (typeof(page)!=='number') return;
    book.gotoPage(page, !emptyHash);
    if (!emptyHash && opts.moveToViewPort && !isInViewPort(book.elem)) book.elem[0].scrollIntoView();
  });

  // forceBasicPage
  if (opts.forceBasicPage) {
    this.foldPage = this.holdHardpage = this.foldPageBasic;
  }

  if (!$.wowBook.support.transform) {
    this.foldPage = this.foldPageBasic;
    if (!$.wowBook.support.filters) this.holdHardpage = this.foldPageBasic;
  }

  // Mouse wheel support
  if (this.mouseWheel) {
    if (book.mouseWheel=="zoom"){
      elem.bind("mousemove.wowbook mouseenter.wowbook", function(event){
        book._mousemoveEvent = event;
      })
    }
    elem.mousewheel(function(e, delta) {
      if (!book.mouseWheel) return;
      if (book.mouseWheel==='zoom') {
        var o = book.elem.offset(),
            event = book._mousemoveEvent,
            x = event.pageX-o.left,
            y = event.pageY-o.top;
        if (delta>0) book.zoomIn({x: x, y: y});
        if (delta<0) book.zoomOut({x: x, y: y});
      } else {
        if (delta>0) book.advance();
        if (delta<0) book.back();
      }
      return false;
    });
  }

  if (this.opts.touchEnabled) this.touchSupport();

  if (opts.toc) this.createToc();

  if (this.opts.thumbnails) this.createThumbnails()
  this.setupFullscreen();

  if ( opts.loadingIndicator && (opts.pdf || opts.images || opts.srcs) ) this.elem.addClass("wowbook-loading");

  this.showPage(this.startPage, false);
  if (this.opts.zoomLevel!=1) this.zoom(this.opts.zoomLevel, {duration: 0});

  if (this.opts.pdf) this.setPDF(this.opts.pdf);

  if (this.opts.lightbox) this.lightbox(this.opts.lightbox);

  // toolbar
  this.toolbars = [];
  if (this.opts.toolbar) {
    this.createToolbar( this.opts.toolbar );
    if ( this.opts.responsiveToolbar && (this.opts.lightbox || this.opts.container) ) {
      this.setupResponsiveToolbar();
    }

  }

  this.setStyle( this.opts.styles || this.opts.style );

  if ( this.opts.navControls ) this.createNavigationControls();

  this.showPage(this.startPage, false);

  if (this.opts.container ) {
    this.updateContainer();
    if ( opts.scaleToFit ) this.scaleToFit();
    if ( opts.responsiveSinglePage ) {
      this.responsiveSinglePage();
    }
  }

  // raf
  this.callRAFCallback = function(){ book.rafCallback() };
  window.raf(this.callRAFCallback);

  if (opts.slideShow) this.startSlideShow();
}// wowBook

// wowBook methods
wowBook.prototype = {


  destroy : function(){
    this.callRAFCallback = $.noop;
    this.curlTimer = clearTimeout( this.curlTimer )
    $("*").add(document).add(window).off(".wowbook");
    this.destroyThumbnails();
    this.destroyToc();
    this.destroyToolbars();
    this.destroyLightbox();
    this.destroyContainer();
    this.stopSlideShow();
    this.stopAnimation(false)
    this.elem.empty().removeData().off()
  } // destroy

  // force configuration specific for mobile
  ,mobileSetup : function(){
    this.opts.hardPageShadow = false;
  } // mobileSetup

  ,setDimensions : function(awidth, aheight){
    if (this.zoomed) this.zoomReset(0);
    this.currentScale = 1;

    var elem = this.elem;
    var oldPageWidth = this.pageWidth;

    elem.css({
      height : aheight,
      width  : awidth
    });

    var parent = elem.parent(),
        display = parent.css("display");
    if ( display.indexOf("flex")>=0 ) parent.css("display", "block");
    var elemHeight = elem.height();
    this.pageWidth  = elem.width()/2;
    this.pageHeight = elemHeight;
    if (!this._originalHeight) this._originalHeight = this.pageHeight;
    if (!this._originalWidth)  this._originalWidth = this.pageWidth*2;
    if ( display.indexOf("flex")>=0 ) parent.css("display", display);

    // page Container
    var origin = this.origin.css({
      width  : '100%',
      height : elemHeight
    })
    if (oldPageWidth && this.centeredWhenClosed) {
      var left = parseFloat(origin.css('left'), 10);
      origin.css('left', left/(oldPageWidth/this.pageWidth));
    }

    this.bookShadow.css({ width: awidth, height: aheight });
    this.setPagesDimension();
    this.positionBookShadow();

    this.shadowClipper.css({ width: elem.width(), height: elemHeight });
    this.hardPageDropShadow.css({ width: this.pageWidth, height: this.pageHeight })

    if (this.opts.handleWidth) $('.wowbook-handle', origin).css('width', this.opts.handleWidth);
    // for some reason IE8 makes this handle disappear when zoomed if we set css 'right:0', so...
    this.rightHandle.css('left', awidth-this.rightHandle.width() );

    // Clip Boundaries
    if ( this.clipBoundaries || this._restoreClipBoundaries ) {
      var pageDiagonal = Math.ceil(Math.sqrt(this.pageWidth*this.pageWidth+this.pageHeight*this.pageHeight)),
        boundaries   = [this.pageHeight-pageDiagonal, elem.width(), pageDiagonal, 0]; // top, right, bottom, left
      this.origin.css('top', -boundaries[0]);
      $(".wowbook-inner-clipper", elem).css({
        width    : '100%',
        height   : boundaries[2]-boundaries[0],
        top      : boundaries[0]
      });
      this.clipper.css({ width:'100%', height: elemHeight });
    }

    // Zoom
    this.zoomWindow.css({
      width    : this.pageWidth*2,
      height   : elemHeight
    });
    this.zoomContent.css({
      width    : this.pageWidth*2,
      height   : elemHeight
    });

    // page corners
    this.corners = {
      tl : [0, 0],
      bl : [0, this.pageHeight],
      tr : [this.pageWidth, 0],
      br : [this.pageWidth, this.pageHeight],
      l  : [0, 0],
      r  : [this.pageWidth, 0]
    };

    if (this.pdf) this.pdfResetPages();

    if (this.thumbnails) this.updateThumbnails();
  }, // setDimensions

  setPagesDimension : function(){
    var content, pw, ph;
    var page;
    for(var i=0,l=this.pages.length;i<l;i++){
      page = this.pages[i];
      pw = page.isCover ? this.pageWidth  : this.opts.pageWidth  || this.pageWidth;
      ph = page.isCover ? this.pageHeight : this.opts.pageHeight || this.pageHeight;
      page.pageWidth  = pw;
      page.pageHeight = ph;
      page.css({
        width: pw,
        height: ph,
        left: page.onLeft ? 0 : this.pageWidth
      });
      content = $('.wowbook-page-content', page);
      boxSizingBorderBox(content, pw, ph);
      this.setPageCorners( page );
    }
    if (this.opts.gutterShadow) {
      $('.wowbook-gutter-shadow', this.elem).css('height', ph); // on IE7, if page content has padding the height 100% will not cover all the pageHeight
    }
  }, // setPagesDimension

  setPageCorners : function( page ){
    var left = 0, right = left+page.pageWidth,
        top  = 0, bottom = top+page.pageHeight;
    page.corners = {
      tl : [left, top],
      bl : [left, bottom],
      tr : [right, top],
      br : [right, bottom],
      l  : [left, top],
      r  : [right, top]
    };
  }, // setPageCorners

  setPagePosition: function(page){
    page.left = page.onLeft ? this.pageWidth-page.pageWidth : this.pageWidth;
    page.top  = Math.floor( (this.pageHeight-page.pageHeight)/2 );
    page.css({ left: page.left , top: page.top });
  }, // setPagePosition

  scale : function(factor){
    if (!$.wowBook.support.transform) return;
    if (this.zoomed) this.zoom(1, 0, { offset: { dx:0, dy: 0 }})
    this.currentScale = factor;
    var container = this.zoomContent;
    if (this.opts.zoomUsingTransform) {
      container.css({
        transform: "scale("+factor+")"
        ,transformOrigin : "0 0"
      })
      this._cssZoom = 1;
    } else {
      container.css('zoom', factor);
      this._cssZoom = factor*this.zoomLevel;
    }
    this.elem.css({
      height : this._originalHeight*factor,
      width  : this._originalWidth*factor
    });
    this.zoomWindow.css({
      height : this._originalHeight*factor,
      width  : this._originalWidth*factor
    });

    this.resizeHandles();
    if (this.opts.onResize) this.opts.onResize(this)
    if ( this.pdfDoc ) this.pdfUpdateRender();
  }, // scale


  scaleToFit : function(widthOrSelector, height){
    var width = widthOrSelector;
    if (!$.isNumeric(widthOrSelector)) {
      var container = $(widthOrSelector || this.opts.scaleToFit);
      if (!container.length) throw "jQuery selector passed to wowbook.resize did not matched in any DOM element."
      width  = container.width();
      height = container.height();
    }
    if (this.opts.maxWidth && width>this.opts.maxWidth) width=this.opts.maxWidth;
    if (this.opts.maxHeight && height>this.opts.maxHeight) height=this.opts.maxHeight;
    if (this._singlePage) width = width*2;
    var ar = this._originalWidth/this._originalHeight;
    if (height*ar<=width) width=height*ar
    else height = width/ar;
    this.scale(height/this._originalHeight)
  }, // scaleToFit

  resize : function(width, height){
    this.setDimensions(width, height);
    if (this.opts.onResize) this.opts.onResize(this)
  }, // resize

  responsive : function(){
    var book=this;
    $(window).on("resize.wowbook", function(){
      book.responsiveUpdater();
    })
  }, // responsive

  responsiveUpdater : function(){
    if ( this.opts.container ) this.updateContainer();
    this.responsiveSinglePage();
    if ( this.opts.container===true && !this.opts.containerHeight ) {
      this.scaleToFit( this.containerBook.width(), 10000 );
      this.containerBook.css( "height", "auto" );
      this.updateContainer();
    } else {
      this.scaleToFit();
    }
    if ( this.lightboxOn ) this.centerLightbox();
  }, // responsiveUpdater

  responsiveSinglePage : function( enabled ){
    var rsp = enabled!=undefined ? enabled : this.opts.responsiveSinglePage;
    if (!rsp) return;

    if (!$.isFunction(rsp)) rsp = function( book ){
      if (!this._isMobile) return false;
      var container = $(book.opts.scaleToFit);
      var w=container.width(), h=container.height();
      return h>w;
    };

    this.singlePage( this.opts.singlePage || rsp.call(this, this) );
  }, // responsiveSinglePage

  resizeHandles : function(){
    if ( !this.opts.responsiveHandleWidth ) return;
    var handleWidth = this.opts.responsiveHandleWidth/this.currentScale;
    $(".wowbook-handle").width( handleWidth );
    // for some reason IE8 makes this handle disappear when zoomed if we set css 'right:0', so...
    this.rightHandle.css('left', this.pageWidth*2-handleWidth );
  }, // resizeHandles


  /*
   * Insert pages in the book
   */
  insertPages : function(pages, dontShowPage){
    for(var i=0,l=pages.length;i<l;i++){
      this.insertPage(pages[i], true);
    };
    this.updateBook(dontShowPage);
  },

  /*
   * Insert a single page in the book
   *
   *  content - the page content, can be a string or a jquery object
   *  dontUpdateBook - boolean, if true updateBook will NOT be called updateBook after the insert.
   *                   Use this if you're insert several pages in batch, and call updateBook after.
   */
  insertPage : function(content, dontUpdateBook){
    if ( this.isDoublePage(content) ) {
      this.insertDoublePage( content, dontUpdateBook )
      return
    }
    var index=this.pages.length;
    content = $(content).addClass('wowbook-page-content');
    var page = $("<div class='wowbook-page'></div>")
           .css({ width: this.pageWidth, height: this.pageHeight, display : 'none', position : 'absolute' })
           .appendTo(this.pagesContainer)
           .append(content);
    if ($.wowBook.support.boxSizing) content.css($.wowBook.support.boxSizing, 'border-box');
    boxSizingBorderBox(content, this.pageWidth, this.pageHeight);
    page.hardPageSetByUser = content.hasClass('wowbook-hardpage');
    if (this.opts.gutterShadow) this.upsertGutterShadowInPage( page );
    this.pages.push(page);

    if (!dontUpdateBook) this.updateBook();

    return page;
  }, // insertPage

  insertDoublePage : function(content, dontUpdateBook){
    if (this._insertingDoublePage) return;
    this._insertingDoublePage = true;

    var leftHalf  = $(content),
        rightHalf = leftHalf.clone().insertAfter(leftHalf),
        whole     = leftHalf.add(rightHalf);
    leftHalf.css('left', 0);
    rightHalf.css('right', '100%');
    whole.css({
      width: "200%",
      height: "100%",
      position: "relative"
    });
    whole.css($.wowBook.support.boxSizing+"", 'border-box')
         .wrap("<div class='wowbook-double-page'></div>");

    leftHalf.parent().data("src", leftHalf.data("src") );
    rightHalf.parent().data("src", rightHalf.data("src") );
    leftHalf.parent().data("image", leftHalf.data("image") );
    rightHalf.parent().data("image", rightHalf.data("image") );

    if (!this.rtl) {
      var leftPage = this.insertPage(leftHalf.parent(), true);
      var rightPage = this.insertPage(rightHalf.parent(), true);
    } else {
      var rightPage = this.insertPage(rightHalf.parent(), true);
      var leftPage = this.insertPage(leftHalf.parent(), true);
    }

    if (leftPage) leftPage.otherHalf = rightPage;
    if (rightPage) rightPage.otherHalf = leftPage;
    if (!$.wowBook.support.boxSizing) {
      boxSizingBorderBox(leftHalf, this.pageWidth*2, this.pageHeight);
      boxSizingBorderBox(rightHalf, this.pageWidth*2, this.pageHeight);
    }

    if (!dontUpdateBook) this.updateBook();
    this._insertingDoublePage = false;
  }, // insertDoublePage

  isDoublePage : function(content){
    content = $(content);
    return content.data("double") || content.is(this.opts.doublePages)
  }, // isDoublePage

  replaceNumberHolder : function(str, number){
    if (str==undefined) return str;
    number += "";
    return str.replace( /\{\{([^}]+)\}\}/g, function(match, p1){
      if (number.length < p1.length) {
        var zeroes = p1.replace(/./g, "0");
        return (zeroes + number).slice(-zeroes.length);
      }
      return number
    })
  }, // replaceNumberHolder

  loadPage : function(page){
    if (typeof(page)==='number') page=this.pages[page];
    if (!page || page.loaded || page.loading || !(page.src || page.image || page.cached || this.pdfDoc) ) return;
    if (page.cached) {
      return this.finishPageLoading(page, page.cache);
    }
    page.loading = true;
    if (this.opts.loadingIndicator) page.addClass("wowbook-loading");
    var book=this;
    if (page.src) {
      if (page.otherHalf && page.otherHalf.loading) { return };
      $.get(page.src, function(content){
        book.finishPageLoading(page, content);
        if (page.otherHalf) book.finishPageLoading(page.otherHalf, content);
      })
    } else if (page.image) {
      var image = new Image();
      image.onload = function(){
        book.finishPageLoading(page, this);
      };
      $(image).addClass("wowbook-lazy");
      image.src = page.image;
    } else if (this.pdfDoc){
      book.pdfLoadPage( page.pageIndex );
    }
  }, // loadPage

  finishPageLoading: function(page, content){
    page.loading = false;
    page.loaded  = true;
    var firstTime = !page.cached;
    page.cached  = false;
    if ( this.opts.loadingIndicator ) {
      page.removeClass("wowbook-loading");
      this.elem.removeClass("wowbook-loading");
    }
    var contentHolder = page.find('.wowbook-page-content');
    if ( firstTime && (page.image || page.src) && this.isDoublePage(contentHolder.children().first()) ) {
      contentHolder = contentHolder.children().first();
    }
    contentHolder.append( content );
    this.upsertNumberInPage( page );
    if (this.opts.gutterShadow) this.upsertGutterShadowInPage( page );
    if (this.opts.onLoadPage) this.opts.onLoadPage(this, page, page.pageIndex);
    if ( this.pdfDoc && !this._onLoadPDFCalled ) {
      var cb = this.opts.onLoadPDF || this.opts.onLoadPdf;
      if ( cb ) { cb(this, page, page.pageIndex); this._onLoadPDFCalled = true }
    }
    this.updateThumbnail( page.pageIndex );
  }, // finishPageLoading

  unloadPage : function(page){
    if (typeof(page)==='number') page=this.pages[page];
    if (!page || !page.loaded || this.isPageToKeep(page) ) return;

    page.cache  = page.find('.wowbook-page-content').html();
    page.find('.wowbook-page-content').empty();
    page.cached = true;
    page.loaded = false;
    if (this.pdfDoc) {
      page.cache  = undefined;
      page.cached = false;
      page.textLayer = null;
    }
    if (this.opts.onUnloadPage) this.opts.onUnloadPage(this, page, page.pageIndex);
  }, // unloadPage

  isPageToKeep : function(page){
    if (!this.opts.pagesToKeep) return false;
    var content = page.find('.wowbook-page-content');
    return page.keep || content.data("keep") || content.is(this.opts.pagesToKeep);
  }, // isPageToKeep

  selectPagesToUnload : function(currentPage){
    if (currentPage==undefined) currentPage=this.currentPage;
    var result=[];
    var left  = this.leftPageIndex(currentPage),
        right = this.rightPageIndex(currentPage),
        leftBelow  = this.pageBelow(left),
        rightBelow = this.pageBelow(right),
        leftBack   = this.backPage(left),
        rightBack  = this.backPage(right);
    leftBack  = leftBack && leftBack.pageIndex;
    rightBack = rightBack && rightBack.pageIndex;
    for(var i=0,l=this.pages.length;i<l;i++) {
      var page=this.pages[i];
      if ( page.loaded && i!=left && i!=right && i!=leftBelow && i!=rightBelow &&
          i!=leftBack && i!=rightBack && !this.isPageToKeep(page) )
        result.push(i);
    }
    return result;
  }, // selectPagesToUnload

  loadedPages : function(){
    var result=[];
    for(var i=0,l=this.pages.length;i<l;i++) if (this.pages[i].loaded) result.push(i);
    return result;
  }, // loadedPages

  unloadUnusedPages : function(currentPage){
    var loaded = this.loadedPages();
    if (loaded.length <= this.opts.pagesInMemory) return;
    var surplus = loaded.length-this.opts.pagesInMemory;

    var p = this.selectPagesToUnload(currentPage);
    for (var i=0;i<surplus;i++){
      this.unloadPage(p[i]);
    }
  }, // unloadUnusedPages


  /*
   * Remove pages
   */
  removePages : function(from, to){
    if (!arguments.length) from=0, to=-1;
    if (this.holdedPage) this.releasePage(this.holdedPage);
    // based on Array Remove By John Resig (MIT Licensed)
    var pages = this.pages,
        to = (to || from) + 1 || pages.length,
        deleted = pages.slice(from, to),
        rest  = pages.slice(to);
    pages.length = (from < 0) ? pages.length + from : from;
    pages.push.apply(pages, rest);
    for(var i=0,l=deleted.length;i<l;i++) {
      deleted[i].remove();
    }
    this.updateBook();
    return pages.length;
  }, // removePages


  /*
   * updateBook
   *
   * update book after some page is inserted or removed.
   */
  updateBook : function(dontShowPage){
    this.doPageNumbering();
    this.findPagesType();
    this.positionBookShadow();

    // apply left and right classes
    var onLeft = (this.rtl && this.closable) || (!this.rtl && !this.closable),
        differentPageSizes = this.opts.pageWidth || this.opts.pageHeight,
        page;
    this.differentPageSizes = differentPageSizes;
    for(var i=0,l=this.pages.length-1;i<=l;i++){
      page = this.pages[i].toggleClass('wowbook-left', onLeft).toggleClass('wowbook-right', !onLeft)
        .data({ pageIndex: i, holded: false });
      page.pageIndex = i;
      page.cover = false;
      page.insideCover = false;
      page.isCover = differentPageSizes && (i==0 || i==l || (this.closable && i==1) || (i==l-1 && !this.otherPage(l)));
      var content = $(".wowbook-page-content", page);
      page.src   = this.replaceNumberHolder( content.data("src") || this.opts.srcs, i);
      page.image = this.replaceNumberHolder( content.data("image") || this.opts.images, i);
      if (page.loaded!=true) page.loaded = (!page.src && !page.image && !page.cached);
      if (!page.loaded && this.opts.loadingIndicator) page.addClass("wowbook-loading");
      page.onLeft = onLeft; page.onRight = !onLeft;
      onLeft = !onLeft;
      page.thickness = this.opts.pageThickness;
      if (differentPageSizes) page.thickness = page.isCover ? this.opts.pageThickness : "1px";
    }
    this.setCovers();
    this.setPagesDimension();
    this.findSections();

    if (this._controls && this._controls["pagecount"]) this._controls["pagecount"].text( this.pages.length );

    if (!dontShowPage) this.showPage(this.currentPage);
  }, // updateBook

  setCovers : function(){
    var last = this.pages.length-1;
    var book = this;
    function setCover( pageIndex ){
      if ( pageIndex!=0 && pageIndex!=last ) return;
      var page = book.pages[pageIndex];
      if (!page) return;
      var back = book.backPage( pageIndex );
      if ( !book.otherPage( pageIndex ) ) {
        page.cover = true;
        page.insideCover = false;
        if (back && !back.cover) back.insideCover=true;
      } else {
        if (!back) {
          page.cover = false;
          page.insideCover = true;
        }
      }
    }
    setCover( 0 );
    setCover( last );

    book.insideCoverLeft = null;
    book.insideCoverRight = null;
    for(var i=0,l=this.pages.length-1;i<=l;i++){
      if ( book.pages[i].insideCover ) {
        if ( book.pages[i].onLeft ) { book.insideCoverLeft = book.pages[i] }
        else { book.insideCoverRight = book.pages[i] }
      }
    }
  }, // setCovers

  /*
   * Single page mode
   */
  singlePage : function( enabled ){
    if (enabled!==undefined) {
      this._singlePage = !!enabled;
      if (this._singlePage) {
        if ( this.clipBoundaries ) {
          // this.clipBoundaries = false;
          // this._restoreClipBoundaries = true;
          this._restoreClipBoundaries = false;
          this.clipBoundaries = true;
          this.clipper.css('overflow', 'visible');
          this.clipper.children('.wowbook-inner-clipper').css('overflow', 'visible');
        }
      } else {
        if (this._restoreClipBoundaries) {
          this._restoreClipBoundaries = false;
          this.clipBoundaries = true;
          this.clipper.css('overflow', 'hidden');
          this.clipper.children('.wowbook-inner-clipper').css('overflow', 'visible');
        }
      }

      var lp = 0,
          width = this.pageWidth;
      if ( this._singlePage ) {
        lp = this.pageIsOnTheRight(this.currentPage) ? -width : 0;
      } else {
        if ( this.centeredWhenClosed ) {
          var lp = !!this.leftPage(this.currentPage), rp=this.rightPage(this.currentPage);
           lp = (lp && rp) ? 0 : (lp ? width/2 : -width/2 );
        }
      }
      this.origin.css('left', lp );
      this.positionBookShadow();
    }
    return this._singlePage;
  }, // singlePage

  /*
   * Numerate the pages
   */
  doPageNumbering : function(){
    var opts=this.opts;
    if (!opts.pageNumbers || !this.pages.length) return;
    var np = opts.numberedPages,
      lastPage = this.pages.length-1,
        lastPageOnLeft = this.pageIsOnTheLeft(lastPage);

    if (np=="all") np = [0, -1];
    if (!np)       np = this.closable ? [2, lastPageOnLeft ? -3 : -2] : [0, -1];

    var first = np[0],
        last  = np[1];
    if (first<0) first=lastPage+first+1;
    if (first<0) first=0;
    if (first>this.pages.length-1) first=lastPage;
    if (last<0) last =lastPage+last+1;
    if (last<0) last=0;
    if (last>this.pages.length-1) last=lastPage;

    var content, pn, i,
        pageNumber=this.opts.firstPageNumber;

    for (i=0; i<lastPage; i++) delete this.pages[i].number;
    for (i=0; i<first; i++) $('.wowbook-page-number', this.pages[i]).remove();
    for (i=last+1; i<lastPage; i++) $('.wowbook-page-number', this.pages[i]).remove();
    for (i=first; i<=last; i++) {
      this.pages[i].number = pageNumber;
      pn = $('.wowbook-page-number', this.pages[i]);
      if (!pn.length){
        content = $('.wowbook-page-content', this.pages[i]);
        pn = $('<div class="wowbook-page-number"></div>').appendTo(content);
      }
      pn.html(pageNumber++);
    }
  }, // doPageNumbering

  upsertNumberInPage : function(page){
    if (typeof(page)==='number') page=this.pages[page];
    if (!page.number && page.number!==0 ) return;
    var pn = $('.wowbook-page-number', page);
    if (!pn.length){
      content = $('.wowbook-page-content', page);
      pn = $('<div class="wowbook-page-number"></div>').appendTo(content);
    }
    pn.html( page.number );
  }, // upsertNumberInPage

  upsertGutterShadowInPage : function(page){
    if (typeof(page)==='number') page=this.pages[page];
    if (!page.find('.wowbook-gutter-shadow').length) {
      var content = page.find('.wowbook-page-content');
      // on IE7, if page content has padding the height 100% will not cover all the pageHeight
      $("<div class='wowbook-gutter-shadow'>").css('height', this.pageHeight).appendTo(content);
    }
  }, // upsertGutterShadowInPage


  findPagesType : function(){
    var opts=this.opts,
      hp={}, index, i, l, isHardPage,
        hardPages = opts.hardPages || [],
      allHardPages = (hardPages===true);

    if (!allHardPages) {
      // hard covers
      if (opts.hardcovers) {
        hardPages.push(0, -1);
        if (this.closable) hardPages.push(1);
        // if last page is 'alone'
        if (!this.otherPage(this.pages.length-1)) hardPages.push(-2);
      }

      // 'normalize' indexes and create a set
      for (i=0,l=hardPages.length;i<l;i++){
        index=hardPages[i];
        if (index<0) index=this.pages.length+index;
        if (index>=0 && index<this.pages.length) hp[index]=true;
      }
    }

    // force the second parameter to false when hp[i]===undefined, otherwise toggleClass will not remove the class
    i=this.pages.length;
    while(i--) {
      isHardPage = allHardPages || hp[i] || this.pages[i].hardPageSetByUser;
      this.pages[i].toggleClass('wowbook-hardpage', isHardPage).isHardPage = isHardPage;
    }
  }, // findPagesType

  showPage : function(pageIndex, updateLocationHash) {
    if (pageIndex < 0) pageIndex = 0;
    if (pageIndex > this.pages.length-1) pageIndex = this.pages.length-1;

    var leftpage  = this.leftPageIndex(pageIndex),
        rightpage = this.rightPageIndex(pageIndex),
        leftBelow  = this.pageBelow(leftpage),
        rightBelow = this.pageBelow(rightpage),
        width     = this.pageWidth,
        onLeft    = this.rtl,
        last      = this.pages.length-1,
        zi, d;

    // lazy loading
    this.loadPage(leftpage);
    this.loadPage(rightpage);
    this.loadPage(leftBelow);
    this.loadPage(rightBelow);
    this.loadPage(this.backPage(leftpage));
    this.loadPage(this.backPage(rightpage));
    if (this.opts.pagesInMemory) this.unloadUnusedPages( pageIndex );

    // set pages visibility/position
    for(var i=0, len=last; i<=len; i++) {
      zi = (this.pages[i].onLeft!=this.rtl) ? i : len-i;
      d = (i===leftBelow || i===leftpage || i===rightpage || i===rightBelow) ? 'block' : 'none';
      this.pages[i].data('zIndex', zi).css({
        display : d,
        left    : this.pages[i].onLeft ? 0 : width,
        top     : 0,
        zIndex  : zi
      });
      this.setPagePosition( this.pages[i] );
      onLeft = !onLeft;
    } // s

    if (this.differentPageSizes){
      if ( leftBelow!==null ) this.insideCoverLeft.css("display", "block");
      if ( rightBelow!==null ) this.insideCoverRight.css("display", "block");
    }

    // enable/disable grab handles and nav controls
    var showingFirstPage = (pageIndex==0 || (!this.closable && pageIndex==1)),
        showingLastPage  = (pageIndex==last || pageIndex==this.otherPage(last));

    this.leftHandle.toggleClass('wowbook-disabled', !this.backPage(leftpage) );
    this.rightHandle.toggleClass('wowbook-disabled', !this.backPage(rightpage) );
    this.toggleControl("back",  showingFirstPage);
    this.toggleControl("next",  showingLastPage);
    this.toggleControl("first", showingFirstPage);
    this.toggleControl("last",  showingLastPage);
    var empty = !this.pages.length;
    this.toggleControl( "left",  empty || (!this.rtl ? showingFirstPage : showingLastPage) );
    this.toggleControl( "lastLeft",  empty || (!this.rtl ? showingFirstPage : showingLastPage) );
    this.toggleControl( "right", empty || (!this.rtl ? showingLastPage : showingFirstPage) );
    this.toggleControl( "lastRight", empty || (!this.rtl ? showingLastPage : showingFirstPage) );

    // onShowPage callback
    var onShowPage = this.onShowPage;
    if (onShowPage && $.isFunction(onShowPage) && !this.isOnPage(pageIndex)) {
      this.currentPage = pageIndex;
      onShowPage(this, this.pages[pageIndex], pageIndex);
      var o=this.otherPage(pageIndex);
      if (o) onShowPage(this, this.pages[o], o);
    }

    this.currentPage = pageIndex;
    if ( this.pdf ) this.pdfUpdateRender();

    if (this._controls["currentpage"]) {
      var spread = this.currentPage+1;
      if ( !this.singlePage() ) {
        spread = [];
        if ( $.isNumeric(leftpage) )  spread.push( leftpage+1 );
        if ( $.isNumeric(rightpage) ) spread.push( rightpage+1 );
        spread = spread.join("-");
      }
      this._controls["currentpage"].text( spread ).val( spread );
    }

    // single page mode
    if (!this._sliding) {
      var lp = (this._singlePage && this.pageIsOnTheRight(pageIndex)) ? -width : 0;
      this.origin.css('left', lp );
      this.origin.css('transform', "");
    }

    // centeredWhenClosed only 1 page visible
    if (this.centeredWhenClosed && !this._singlePage) {
      var lp = !!this.leftPage(pageIndex), rp=this.rightPage(pageIndex),
          lefty = (lp && rp) ? 0 : (lp ? width/2 : -width/2 );
      this.origin.css('left', lefty );
    }

    this.positionBookShadow();

    if (updateLocationHash!==false
     && this.opts.updateBrowserURL
     && this.locationHashToPage()!=pageIndex) {
      this.locationHashSetTo = window.location.hash = this.pageToLocationHash(pageIndex);
    }

    this.showThumbnail()
  }, // showPage

  slideX : function( x, callback ){
    var from = parseFloat( this.origin.css('left') ),
        dx   = x-from;
    this.origin.css('left', 0);
    var self=this;
    this._move = 0;
    this._sliding = true;
    $(this).animate({ _move:1 }, {
      duration : this.opts.turnPageDuration, //duration,
      easing   : 'linear',
      complete : function(){
        this._sliding = false;
        this.origin.css('transform', '');
        this.origin.css('left', x);
        this.positionBookShadow();
        if ($.isFunction(callback)) callback();
      },
      step:function(e, b){
        self.translate( this.origin, from+e*dx );
        this.positionBookShadow();
      }
    })
  }, // slideX

  holdPage : function(page, x, y, corner, back) {
    if (typeof(page)==='number') page=this.pages[page];
    if (!page) return;
    var pageIndex = page.pageIndex,
        last = this.pages.length-1,
        lastPageIsAlone = !this.otherPage(last);

    if (!corner) corner=this.pageIsOnTheLeft(pageIndex) ? 'l' : 'r'
    else {
      if (!this.corners[corner] ||
          (this.pageIsOnTheLeft(pageIndex) ? /r/ : /l/).test(corner) ) return;
    }

    if (back===undefined) back = this.backPage(pageIndex);
    if (!back) return;
    var backIndex = back.pageIndex;

    page.data('holded_info', [x,y,corner])

    if (!this._singlePage && this.centeredWhenClosed && (pageIndex===0 || backIndex===0 ||
        (lastPageIsAlone && (backIndex===last || pageIndex===last)))) {
      var lefty=0, newx, ltr = !this.rtl,
        width = this.pageWidth,
        trStart, trEnd,
        lrStart, lrEnd,
        xrStart, xrEnd, xbeforeStart, xafterEnd;
      if (ltr ? pageIndex===0 : (pageIndex===last && lastPageIsAlone)) {
        trStart = -width/2; trEnd = -width/4;
        lrStart = 0;        lrEnd = -width/2;
        xrStart = -width;   xrEnd = trEnd;
        xbeforeStart = xrStart; xafterEnd = x;
      }
      if (ltr ? (pageIndex===last && lastPageIsAlone) : pageIndex===0 ) {
        trStart = width;    trEnd = width*3/2;
        lrStart = width/2;  lrEnd = 0;
        xrStart = width;    xrEnd = width*2;
        xbeforeStart = x; xafterEnd = xrEnd;
      }
      if (ltr ? backIndex===0 : (backIndex===last && lastPageIsAlone)) {
        trStart = width/2;    trEnd = pageIndex===(ltr?last:0) ? width : width*3/2;
        lrStart = pageIndex===(ltr?last:0) ? width/2 : 0;        lrEnd = -width/2;
        xrStart = trStart;  xrEnd = width*2;
        xbeforeStart = x; xafterEnd = xrEnd;
      }
      if (ltr ? (backIndex===last && lastPageIsAlone) : backIndex===0)  {
        trStart = pageIndex===(ltr?0:last) ? 0 : -width/2; trEnd = width/2;
        lrStart =  width/2; lrEnd = pageIndex===(ltr?0:last) ? -width/2 : 0;
        xrStart = -width;   xrEnd = trEnd;
        xbeforeStart = xrStart; xafterEnd = x;
      }

      if (x<trStart) { lefty = lrStart; newx = xbeforeStart; }
      if (x>trEnd)   { lefty = lrEnd;   newx = xafterEnd; }
      if (x>=trStart && x<=trEnd) {
        var px = (x-trStart)/(trEnd-trStart);
        lefty  = lrStart+px*(lrEnd-lrStart);
        newx   = xrStart+px*(xrEnd-xrStart);
      }
      x = newx;
      this.origin.css('left', lefty);
      this.positionBookShadow();
    }

    if (this.zoomed || this.pageType(page)=='basic' || this.pageType(back)=='basic' ) {
      this.foldPageBasic(page, x, y, corner, back);
    } else if (page.isHardPage || (back.isHardPage)) {
      this.holdHardpage(page, x, y, corner, back);
    } else {
      this.foldPage(page, x, y, corner, back);
    }

    if (!page.data('holded')) {
      page.addClass('wowbook-page-holded');
      back.addClass('wowbook-page-holded');
      page.data('holded', true);
      this.holdedPage = page;
      this.holdedPageBack = back;
      if (this.shadows) this.shadowClipper.css('display', 'block');
      if (this.clipBoundaries) this.clipper.css('overflow', 'visible');
      this.positionBookShadow();
      if (this.opts.onHoldPage) this.opts.onHoldPage(this, pageIndex, page, back);
    }
  }, // holdPage

  /*
  * foldPage
  */
  foldPage :function(page, x, y, corner, back){
    if (!this._currentFlip) this._currentFlip = this.foldPageStart(page, x, y, corner, back);
    if (this._currentFlip.page!=page) return

    this._currentFlip.x = x;
    this._currentFlip.y = y;
    this._currentFlip.page.data('holdedAt', {x: x, y: y });
    this._currentFlip.corner = corner;
    this.foldPageStyles(this._currentFlip);
  }, // foldPage

  foldPageStart: function(page, x, y, corner, back){
    var flip = {};

    if (typeof(page)==='number') page=this.pages[page];
    flip.book = this;
    flip.page = page;
    flip.pageIndex = page.data('pageIndex');

    if (back===undefined) back = this.backPage(flip.pageIndex);
    if (!back || !back.length) return;
    flip.back = back;

    // contents
    flip.pageContent = page.children().first();
    flip.backContent = back.children().first();

    // helpers
    var width      = flip.page.pageWidth,
        height     = flip.page.pageHeight,
        halfWidth  = width/2,
        halfHeight = height/2;

    // corner
    if (!corner) corner='tl';
    if (corner=='l' || corner=='r') {
      var grabPoint = {
        x: (corner=='l') ? 0 : width,
        y: y
      };
      page.data('grabPoint', grabPoint);
      flip.grabPoint = grabPoint;
      corner = ( (y>=grabPoint.y) ? 't' : 'b') + corner;
    }

    flip.page.data('holdedAt', {x: x, y: y });
    flip.x = x;
    flip.y = y;
    flip.page.data('holdedCorner', corner);
    flip.corner = corner;
    flip.pageDiagonal = Math.sqrt(width*width+height*height);

    // inicializacao
    var diagonal = Math.ceil( flip.pageDiagonal ),
        clipRect = 'rect(-'+diagonal+'px '+diagonal+'px '+diagonal+'px 0px)';
    flip.page.css("clip", clipRect);

    flip.pageLeft = parseFloat(page.css('left'));
    back.css({
      left   : flip.pageLeft+"px",
      zIndex : 100000,
      clip   : clipRect
    });
    // shadow
    flip.shadowHeight = 2*Math.ceil( flip.pageDiagonal ),
    flip.shadowTop    = -(flip.shadowHeight-height)/2;
    this.shadowClipper.css({
      top: flip.page.top,
      left: page.onLeft ? page.left : back.left ,
      width: width*2,
      height: height
    })
    this.internalShadow.css({
      display : 'block',
      height : flip.shadowHeight
    });
    flip.foldShadowWidth = this.foldShadow.width();
    this.foldShadow.css({
      display: 'block',
      height : flip.shadowHeight
    });

    // foldGradient
    this.foldGradientContainer.appendTo(flip.backContent);
    flip.foldGradientWidth  = this.foldGradientElem.width();
    flip.foldGradientHeight = 2*Math.ceil( flip.pageDiagonal );
    this.foldGradientElem.css('height', flip.foldGradientHeight)
    this.foldGradientContainer.css({
      position : 'absolute',
      width    : flip.foldGradientWidth,
      height   : flip.foldGradientHeight,
      top      : 0,
      left     : 0,
      display  : "none"
    })
    flip.foldGradientVisible = false;

    return flip
  }, // foldPageStart

  foldPageStyles : function(flip){
    var width      = flip.page.pageWidth,
        height     = flip.page.pageHeight,
        halfWidth  = width/2,
        halfHeight = height/2,
        translate  = $.wowBook.utils.translate;

    var pageLeft = flip.pageLeft,
        x=flip.x, y=flip.y, back=flip.back;

    // corner

    var corner = flip.corner || "tl";
    if (corner=='l' || corner=='r') {
      var grabPoint=flip.page.data('grabPoint');
      if (!grabPoint) {
        grabPoint = {
          x: (corner=='l') ? 0 : width,
          y: y
        };
        page.data('grabPoint', grabPoint);
      };
      corner = ( (y>=grabPoint.y) ? 't' : 'b') + corner;
      corner = ( (y>=grabPoint.y) ? 't' : 'b') + (this.pageIsOnTheLeft(flip.pageIndex) ? "l" : "r");
      flip.corner = corner;
      flip.page.data('holdedCorner', corner);

      var dx    = (x-grabPoint.x),
          dy    = (y-grabPoint.y),
          angle = Math.atan2(dy,dx),
          corn  = { x: 0, y: (y>=grabPoint.y) ? 0 : height },
          n     = { x: 0, y: corn.y-grabPoint.y };
      n = rotatePoint(n, 2*angle)
      x = n.x+x;
      y = n.y+y;
    }

    flip.page.data('holdedAt', {x: x, y: y });
    flip.page.data('holdedCorner', corner);

    // first fixed corner
    var cornerxy = flip.page.corners[ corner ],
        fx = width-cornerxy[0],
        fy = cornerxy[1];
    var dx = (x-fx),
        dy = (y-fy),
        distance = Math.sqrt(dx*dx+dy*dy);
    if (distance > width) {
      x = fx+(width*dx/distance);
      y = fy+(width*dy/distance);
    }


    // second fixed corner
    fy = height-fy;
    var dx = (x-fx),
        dy = (y-fy),
        distance = Math.sqrt(dx*dx+dy*dy),
        maxdistance = flip.pageDiagonal ;
    if (distance > maxdistance) {
      x = fx+(maxdistance*dx/distance);
      y = fy+(maxdistance*dy/distance);
    }

    var cx = cornerxy[0], cy=cornerxy[1];

    if (cy==y) y=cy+0.001;

    var dx = (x-cx),
        dy = (y-cy),
        distance = Math.sqrt(dx*dx+dy*dy),
        halfd    = distance/2,
        angle    = Math.atan2(dy,dx),
        tan_a    = Math.tan(angle),
        ar       = angle,
        angle    = angle*180/Math.PI;

    var bc  = { x : cx-halfWidth, y: halfHeight-cy },
      bc2 = rotatePoint(bc, ar);
    var xcut = bc2.x+halfd + halfWidth + 0.5;

    flip.pageContent.css('transform', translate(-xcut, 0)+' rotate('+(-angle).toFixed(7)+'deg)');
    flip.page.css('transform', translate((Math.cos(ar)*xcut).toFixed(5), (Math.sin(ar)*xcut).toFixed(5))+' rotate('+angle.toFixed(7)+'deg)' );

    /* shadow */
    var op = this.calculateOpacity(halfd, width, this.shadowThreshold, 50);
    if (this.shadows && (op > 0)) {
      var left = xcut+( flip.page.onRight ? flip.page.pageWidth : 0 ),
          top  = flip.shadowTop;
      this.internalShadow.css({
        transform: translate(left, top)+' rotate('+angle+'deg)',
        transformOrigin : halfWidth-xcut+"px "+(halfHeight+(flip.shadowHeight-height)/2)+"px"
      });

      var ls = xcut-flip.foldShadowWidth;

      this.foldShadow.css({
        transform: translate(ls+( flip.page.onRight ? flip.page.pageWidth : 0 ), top)+' rotate('+angle+'deg)',
        transformOrigin : halfWidth-ls+"px "+(halfHeight+(flip.shadowHeight-height)/2)+"px"
      });

      this.shadowContainer.css({ opacity : op, display : 'block' });
    } else {
      this.shadowContainer.css("display", "none");
    }

    // back
    back.show();

    bc.x = -bc.x;
    var bc2  = rotatePoint(bc, -ar);
    var xcut = bc2.x-halfd + halfWidth - 1;

    var t1, t2;
    t1 = { x : bc2.x-halfd, y : bc2.y+halfd*tan_a }
    t2 = { x : bc2.x-halfd, y : bc2.y-halfd/(tan_a==0 ? 0.0001 : tan_a) }
    t1 = rotatePoint(t1, -ar);
    t2 = rotatePoint(t2, -ar);
    t2 = -(t2.x + halfWidth);
    t1 = -(t1.y - halfHeight);

    flip.backContent.css('transform', translate(-xcut, 0)+' rotate('+angle+'deg)' );
    flip.back.css('transform', translate((cx+t2+Math.cos(ar)*xcut).toFixed(5), (cy-t1+Math.sin(ar)*xcut).toFixed(5))+' rotate('+angle+'deg)');

    // fold Gradient
    var op = this.calculateOpacity(halfd*2, width*2, this.foldGradientThreshold, 50);
    if (this.foldGradient && (op > 0)) {
      this.foldGradientContainer.css({
        opacity   : op,
        display   : 'block',
        transform : translate(((width-cx)-flip.foldGradientWidth/2), (cy-flip.foldGradientHeight/2))+' rotate('+(-angle)+'deg)'
      });
      this.foldGradientElem.css("transform", translate(-halfd+flip.foldGradientWidth/2, 0));
      if (!flip.foldGradientVisible) {
        this.foldGradientContainer.css("display", "block");
        flip.foldGradientVisible = true;
      }

    } else {
      if (flip.foldGradientVisible) {
        this.foldGradientContainer.css("display", "none");
        flip.foldGradientVisible = false;
      }
    }
  }, // foldPageStyles

  holdHardpage : function(page, x, y, corner, back) {
    if (!this._currentFlip) this._currentFlip = this.flipHardPageStart(page, x, y, corner, back);
    if (this._currentFlip.page!=page) return

    this._currentFlip.x = x;
    this._currentFlip.y = y;
    this._currentFlip.page.data('holdedAt', {x: x, y: y });
    this._currentFlip.corner = corner;

    this.flipHardPageStyles(this._currentFlip);
  }, // holdHardpage

  flipHardPageStart : function(page, x, y, corner, back) {
    if (this.clipBoundaries) this.clipper.children('.wowbook-inner-clipper').css('overflow', 'visible');

    if (!this.border3D && this.opts.pageThickness && this.opts.use3d && Modernizr.csstransforms3d) {
      this.border3D=$('<div class="wowbook-3d-border">');
      this.border3D.css("background", this.opts.pageEdgeColor);
    }

    if (this.opts.hardPageShadow && !this.hardPageShadow) this.hardPageShadow=$('<div class="wowbook-hard-page-shadow">');

    var flip = {};

    if (typeof(page)==='number') page=this.pages[page];
    flip.book = this;
    flip.page = page;
    flip.pageIndex = page.data('pageIndex');

    if (back===undefined) back = this.backPage(flip.pageIndex);
    if (!back || !back.length) return;
    flip.back = back;

    // helpers
    var width      = page.pageWidth,
        height     = page.pageHeight,
        halfWidth  = width/2,
        halfHeight = height/2;

    if (!corner) corner='tl';
    page.data('holdedAt', {x: x, y: y });
    page.data('holdedCorner', corner);

    page.css("zIndex", 100000);
    back.css("zIndex", 100000);

    if (this.opts.use3d && Modernizr.csstransforms3d) {
      page.css(Modernizr.prefixed('perspectiveOrigin'), '0 50%');
      back.css(Modernizr.prefixed('perspectiveOrigin'), '0 50%');
    }
    var x0 = ( page.onLeft ? width : 0 );
    page.css("transformOrigin", x0+'px 50%');
    back.css("transformOrigin", (width-x0)+'px 50%');
    if (this.border3D) this.border3D.css("width", page.thickness);

    // shadow
    if (this.shadows) this.hardPageDropShadow.css({
      display : 'block',
      width   : page.pageWidth,
      height  : page.pageHeight,
      top     : page.top
    });

    return flip
  }, // flipHardPageStart

  flipHardPageStyles : function(flip) {
    var page       = flip.page,
        back       = flip.back,
        x=flip.x, y=flip.y;

    var onRight   = this.pageIsOnTheRight(flip.pageIndex),
        width     = this.pageWidth,
        height    = this.pageHeight,
        corner    = flip.corner;

    if (!corner) corner='tl';
    page.data('holdedAt', {x: x, y: y });
    page.data('holdedCorner', corner);

    var dx    = onRight ? width-x : x,
        fixed = onRight ? 0       : width,
        p, same;
    if (dx<0) dx=0;
    same = dx < width;
    p = same ? page : back;
    (same ? back : page).css('display', 'none');
    var pIsOnLeft = onRight!=same,
        cx        = x-fixed;
    if (cx>width)  cx=width;
    if (cx<-width) cx=-width;
    var cy     = -Math.sqrt( 40*40*(1-cx*cx/((width+15)*(width+15))) ),
        scaleX = Math.abs(cx/width),
        angle  = scaleX==1 ? 0 : Math.atan2(cy,cx);

    if (this.opts.use3d && Modernizr.csstransforms3d) {
      var roty;
      if (pIsOnLeft)
        roty = -this._calculateAngleFromX(-cx, width)
      else
        roty = this._calculateAngleFromX(cx, width)

      if (this.animating){
        var anim = this._animationData;
        if (this.curledPage || anim.curled ) {
          anim.curled = true
          if (!anim.angle){
            var angle = { from : roty, to : 0 }
            anim.angle = angle;
            var cx2 = cx+anim.dx;
            if (pIsOnLeft)
              angle.to = -this._calculateAngleFromX(-cx2, width)
            else
              angle.to = this._calculateAngleFromX(cx2, width)
            if (Math.abs(cx)==width) angle.from = 0
            if (Math.abs(cx2)==width) angle.to = 0
            angle.delta = angle.to-angle.from
          }
          roty = anim.angle.from - anim.angle.delta*(anim.from.x-x)/anim.dx
        } else if ( Math.abs(x-anim.from.x)>Math.abs(anim.dx/2) ) {
        }
      }
      p.append(this.border3D);
      if (this.hardPageShadow) {
        p.append(this.hardPageShadow);
        this.hardPageShadow.css("opacity", 1-scaleX);
      }
      p.css({
        transform : 'perspective('+this.opts.perspective+this.perspectiveUnit+') rotate3d(0, 1, 0, '+(roty)+'deg)',
        display   : 'block'
      });
    } else {
      p.css({
        transform : 'skewY('+angle+'rad) scaleX('+scaleX+')',
        display   : 'block'
      });
    }

    if (!$.wowBook.support.transform && $.wowBook.support.filters) {
      var matrix = "M11="+scaleX+", M12=0, M21="+Math.tan(angle)*scaleX+", M22=1";
      // for some reason putting margins with filter in the same $().css call doesn't work
      p.css('filter', "progid:DXImageTransform.Microsoft.Matrix("+matrix+", sizingMethod='auto expand')" );
      p.css({
        marginTop  : height-p.height(),
        marginLeft : ( pIsOnLeft ? width-p.width() : 0)
      });
    }

    // shadow
    if (this.shadows) this.hardPageDropShadow.css({
      left    : pIsOnLeft ? (page.onLeft ? page.left:back.left) : width,
      opacity : Math.abs(cx)<width/2 ? 0 : (Math.abs(cx)-width/2)/width*0.8
    });
  }, // flipHardPageStyles


  _calculateAngleFromX : function(x, width, perspective){
    var halfWidth = width*2/3;
    if ( x>halfWidth ) {
      var startAngle = this._calculateAngleFromX(halfWidth, width, perspective),
          endAngle   = 0,
          dx         = (x-halfWidth)/(width-halfWidth),
          angle      = startAngle+(endAngle-startAngle)*dx;
      return angle
    }
    perspective = perspective || this.opts.perspective
    var angle, rad2deg = 180/Math.PI,
        w2      = width*width, p2= perspective*perspective, x2= x*x;
    angle = Math.acos( (width*p2*x - Math.sqrt(w2*w2*p2*x2 + w2*w2*x2*x2-w2*p2*x2*x2))/(w2*p2 + w2*x2));
    angle = -angle * rad2deg;
    return angle;
  }, // _calculateAngleFromX


  // foldPageBasic, does not use CSS transform
  foldPageBasic : function(page, x, y, corner, back) {
    if (!this._currentFlip) this._currentFlip = this.foldPageBasicStart(page, x, y, corner, back);
    if (!this._currentFlip || this._currentFlip.page!=page) return

    this._currentFlip.x = x;
    this._currentFlip.y = y;
    this._currentFlip.page.data('holdedAt', {x: x, y: y });
    this._currentFlip.corner = corner;
    this.foldPageBasicStyles(this._currentFlip);
  }, // foldPageBasic

  foldPageBasicStart : function(page, x, y, corner, back) {
    var flip = {};

    if (typeof(page)==='number') page=this.pages[page];
    flip.book = this;
    flip.page = page;
    flip.pageIndex = page.data('pageIndex');

    if (back===undefined) back = this.backPage(flip.pageIndex);
    if (!back || !back.length) return;
    flip.back = back;

    // helpers
    var width      = page.pageWidth,
        height     = page.pageHeight;

    if (!corner) corner='tl';
    page.data('holdedAt', {x: x, y: y });
    page.data('holdedCorner', corner);

    back.css('zIndex', 100000);
    page.data('foldPageBasic', true);
    flip.foldGradientWidth  = this.foldGradientElem.width();
    flip.foldShadowWidth = this.foldShadow.width();
    this.internalShadow.css('display', 'none');
    this.foldShadow.css({
      display   : 'none',
      height    : height,
      transform : '',
      top       : page.top
    }).toggleClass('wowbook-shadow-fold-flipped', page.onRight);
    this.shadowContainer.css('display', 'block');
    var backContent = back.children().first();
    this.foldGradientContainer
      .appendTo(backContent)
      .css({ width : flip.foldGradientWidth,  height : height, top: 0, transform: '', zIndex: 1000000000 });
    this.foldGradientElem.css({
      left   : 0,
      height : height
    }).toggleClass('wowbook-fold-gradient-flipped', page.onRight);

    return flip
  }, // foldPageBasicStart

  foldPageBasicStyles : function(flip) {
    var page   = flip.page,
        back   = flip.back;
        x=flip.x, y=flip.y;

    var width  = page.pageWidth,
        height = page.pageHeight,
        corner = flip.corner;

    if (!corner) corner='tl';
    page.data('holdedAt', {x: x, y: y });
    page.data('holdedCorner', corner);

    var onLeft = this.pageIsOnTheLeft(flip.pageIndex),
        fixed  = onLeft ? width : 0 ,
        dx     = onLeft ?     x : width-x;
    if (dx<0) dx=0;
    if (dx>2*width) dx=2*width;
    var halfd = dx/2;
    var pageclip, backclip, leftb;
    if (onLeft) {
      pageclip = 'rect(-1000px '+width+'px '+height+'px '+halfd+'px)';
      backclip = 'rect(-1000px '+width+'px '+height+'px '+(width-halfd)+'px)';
      leftb    = page.left+(dx-width);
    } else {
      pageclip = 'rect(-1000px '+(width-halfd)+'px '+height+'px -1000px)';
      backclip = 'rect(-1000px '+halfd+'px '+height+'px -1000px)';
      leftb    = back.left+(width-dx+width);
    }

    page.css('clip', pageclip);
    back.css({ clip: backclip, left: leftb, display:'block' });

    // shadow
    var op = this.calculateOpacity(halfd*2, width*2, this.shadowThreshold, 50);
    if (this.shadows && (op > 0)) {
      var leftx = onLeft ? page.left+ halfd-flip.foldShadowWidth : back.left+ width-halfd + width;
      this.shadowContainer.css('opacity', op);
      this.foldShadow.css({
        left    : leftx,
        display : 'block'
      });
    } else {
      this.foldShadow.css('display', 'none');
    }

    // Gradient
    var op = this.calculateOpacity(halfd*2, width*2, this.foldGradientThreshold, 50);
    if (this.foldGradient && (op > 0)) {
      var leftx = onLeft ? width-halfd : halfd-flip.foldGradientWidth;
      this.foldGradientContainer.css({
        opacity  : op,
        left     : leftx,
        display  : 'block'
      });
    } else {
      this.foldGradientContainer.css('display', 'none');
    }
  }, // foldPageBasicStyles

  stopAnimation : function(jumpToEnd){
    if (!arguments.length) jumpToEnd=true
    $(this).stop(true, jumpToEnd);
    this.animating = false;
    if (this.currentFlip) this.currentFlip.finished=true;

  }, // stopAnimation

  // valid options:
  //    from: [x,y] initial x,y coordinates
  //    to: [x,y] final x,y coordinates
  //    page:
  //    back:
  //    corner :
  //    duration:
  //    easing: easing function
  //    complete : callback function called once the animation is complete.
  flip : function(x, y, page, options) {
    if (!options) options = ($.isPlainObject(x) ? x : {});
    if (!options.from) options.from=[]
    if (!options.to) options.to=[]
    var book = this;

    if (book.animating) return
    book.animating = true;

    var flipCompleted = function(){
      book.animating = false;
      if ($.isFunction(options.complete)) options.complete();
    }
    if (!page) page = options.page || book.holdedPage;
    var hi = page.data('holded_info');
    var initial = page.data('holdedAt') || {};
    var corner  = options.corner || page.data('holdedCorner');
    var easing  = $.easing[options.easing] || options.easing
                  || function(x){ return (x==1) ? 1 : (-Math.pow(2, -10 * x) + 1) };
    var flip = {
      page     : page,
      back     : options.back || book.holdedPageBack || book.backPage(page.pageIndex),
      initialX : options.from[0]!=undefined ? options.from[0] : hi[0],
      initialY : options.from[1]!=undefined ? options.from[1] : hi[1],
      finalX   : options.to[0]!=undefined ? options.to[0] : x,
      finalY   : options.to[1]!=undefined ? options.to[1] : y,
      corner   : corner || hi[2],
      duration : options.duration,
      complete : flipCompleted,
      easing   : easing,
      arc      : options.arc,
      dragging : options.dragging,
      start    : $.now(),
      finished : false
    }
    flip.deltaX = flip.finalX - flip.initialX;
    flip.deltaY = flip.finalY - flip.initialY;

    this._animationData = {
      from: {x: flip.initialX, y: flip.initialY},
      to: {x: flip.finalX, y: flip.finalY},
      dx: flip.deltaX
    }

    if (flip.duration==undefined) flip.duration = this.turnPageDuration * Math.abs(flip.deltaX)/(this.pageWidth*2);
    if (flip.duration<this.opts.turnPageDurationMin) flip.duration=this.opts.turnPageDurationMin
    if (!page.isHardPage && flip.duration/this.turnPageDuration>0.4) this.playFlipSound();

    this.currentFlip = flip;
  }, // flip

  rafCallback: function(){
    window.raf(this.callRAFCallback);
    this._zoomUpdateOnRAF();

    if (!this.currentFlip || this.currentFlip.finished) return;

    var flip    = this.currentFlip,
        percent = ( $.now()-flip.start )/flip.duration;
    if (percent>=1) percent=1;
    flip.x = flip.initialX+flip.deltaX*flip.easing(percent, flip.duration*percent, 0, 1, flip.duration);
    flip.y = flip.initialY+flip.deltaY*flip.easing(percent, flip.duration*percent, 0, 1, flip.duration);
    if (flip.arc) flip.y -= (0.5-Math.abs(0.5-flip.easing(percent, flip.duration*percent, 0, 1)))*this.pageHeight/10;
    if (flip.dragging){
      flip.x = flip.initialX+flip.deltaX*0.2;
      flip.y = flip.initialY+flip.deltaY*0.2;
      flip.initialX = flip.x; flip.initialY = flip.y;
      flip.deltaX = flip.finalX - flip.initialX;
      flip.deltaY = flip.finalY - flip.initialY;
      if (flip.deltaX<1 && flip.deltaY<1) percent==1;
    }
    this.holdPage(flip.page, flip.x, flip.y, flip.corner, flip.back);
    if (percent==1) {
      flip.finished=true;
      if (flip.complete) flip.complete();
    }
  }, // rafCallback


  releasePages : function(){
    for (var i=0,l=this.pages.length;i<l;i++){
      if (this.pages[i].data('holded')) this.releasePage(i);
    }
  }, // releasePages

  releasePage : function(page, animated, back, duration){
    if (typeof(page)==='number') page=this.pages[page];
    var book=this,
      from   = page.data('holdedAt'),
      corner = page.data('holdedCorner');
    if (animated && from) {
      this.flip({ from: [from.x, from.y], to: page.corners[ corner ], page: page,
        easing   : 'linear',
        duration : 10000, //duration,
        duration : duration,
        complete : function(){ book.releasePage(page); }
      })
      return
    }
    var pageIndex = page.data('pageIndex');

    if (back===undefined) back = this.holdedPageBack || this.backPage(pageIndex);
    this.holdedPage = null;
    this.holdedPageBack = null;
    page.data({
      holded_info   : null,
      holdedAt      : null,
      holdedCorner  : null,
        grabPoint     : false,
      foldPageBasic : null,
      holded        : false
    });
    if (this.clipBoundaries && !this.zoomed) {
      this.clipper.css('overflow', 'hidden');
      this.clipper.children('.wowbook-inner-clipper').css('overflow', 'hidden');
    }

    this.shadowClipper.css('display', 'none');

    this.internalShadow.parent().hide();
    this.foldGradientContainer.hide();
    this.hardPageDropShadow.hide();
    this.resetPage(page);

    if (back && back.length) {
      this.resetPage(back);
      back.hide();
    }

    this.foldShadow.removeClass('wowbook-shadow-fold-flipped')
      .css({ transform: '', left: '' });
    this.foldGradientElem.removeClass('wowbook-fold-gradient-flipped')
      .css('transform', '');
    this.foldGradientContainer.css('transform', '').appendTo(this.pagesContainer);
    this.positionBookShadow();
    if (this.opts.onReleasePage) this.opts.onReleasePage(this, pageIndex, page, back);
  }, // releasePage

  resetPage : function(page){
    this._currentFlip = undefined;
    page.removeClass('wowbook-page-holded');
    if (!this.resetCSS) this.resetCSS = {
      transform           : '',
      transformOrigin     : '',
      clip                : 'auto',
      marginLeft          : 0,
      marginTop           : 0,
      filter              : ''
    };
    var w=page.pageWidth, h=page.pageHeight;
    page.css(this.resetCSS)
      .css({ zIndex: page.data('zIndex'), width: w, height: h
        ,left: page.onLeft ? 0 : this.pageWidth
      });
    this.setPagePosition( page );
    // what can i say? IE SUCKS
    if ($.browser.msie && $.browser.version<9)
      page.attr('style', page.attr('style').replace(/clip\: [^;]+;/i, ''));

    var content = $('.wowbook-page-content', page);
    content.css(this.resetCSS);
    boxSizingBorderBox(content, w, h);
    if (this.hardPageShadow) this.hardPageShadow.hide();
  }, // resetPage

  gotoPage : function(pageIndex, updateBrowserURL){
    if (this.animating) return;
    if ((typeof pageIndex==='string') && pageIndex.charAt(0)=='#') pageIndex=this.selectorToPage(pageIndex);
    if (pageIndex<0) pageIndex = 0;
    if (pageIndex>this.pages.length-1) pageIndex = this.pages.length-1;

    if (this._singlePage) {
      if (pageIndex==this.currentPage) { return; }
    } else if (this.isOnPage(pageIndex)) { return; }

    if ( !this.elem.is(":visible") ) {
      this.showPage(pageIndex, updateBrowserURL);
      return pageIndex;
    }

    this._cantStopAnimation = true;

    var goingBack = (pageIndex < this.currentPage),
        goingLeft = (this.rtl ? (pageIndex > this.currentPage) : goingBack);

    var book = this,
        page = goingLeft ? book.leftPage() : book.rightPage();
    if (!page) return;

    this.uncurl(true)

    var pageBelow, back;
    if (goingLeft) {
      pageBelow = this.leftPage(pageIndex);
      back      = this.rightPage(pageIndex);
    } else {
      pageBelow = this.rightPage(pageIndex);
      back      = this.leftPage(pageIndex);
    }

    var mixedFlip = this.closable && this.differentPageSizes && ( page.isCover != back.isCover );
    if ( mixedFlip && page.pageIndex!==pageIndex ) {
      if ( page.pageIndex==0 || back.pageIndex==0 ) {
        this.showPage(1,false);
      } else {
        var lastPage = this.pages.length-1;
        var lastPageAlone = !this.otherPage( lastPage );
        if ( lastPageAlone && (page.pageIndex==lastPage || back.pageIndex==lastPage )) this.showPage( this.backPage(lastPage).pageIndex, false);
      }
      this.gotoPage( back.pageIndex );
      return
    }

    var backIsVisible = back && back.is(":visible");

    // put the page to be shown below the current page
    if (goingBack) {
      for(var i=page.pageIndex-1; i>=0; i--)
        this.pages[i].css('display', 'none');
    } else {
      for(var i=page.pageIndex+1, len=this.pages.length; i<len; i++)
        this.pages[i].css('display', 'none');
    }

    if (pageBelow) {
      pageBelow.css('display', 'block');
      if (pageBelow.onLeft) this.insideCoverLeft.css('display', 'block')
      else this.insideCoverRight.css('display', 'block');
    }
    // without this, back page might blink
    if (backIsVisible) back.css('display', 'block');

    var pn = pageIndex;

    // turns the page
    var isHolded = page.data('holdedAt'),
      from     = page.data('holdedAt'),
      to,
        corner   = page.data('holdedCorner') || (goingLeft ? 'tl' : 'tr');

    if (goingLeft) {
      from = from || { x:0, y:0};
      to   = {
        x: book.pageWidth*2,
        y: (corner!='bl' ? 0 : page.pageHeight)
      };
    } else {
      from = from || { x:page.pageWidth, y:0},
      to   = {
        x: -page.pageWidth,
        y: (corner!='br' ? 0 : page.pageHeight)
      };
    }

    var easing='linear';

    if (this.centeredWhenClosed && !this._singlePage && (page.isHardPage || back.isHardPage)) {
      var lastPage = this.pages.length-1,
          ltr = !this.rtl;
      easing = 'easeOutCubic'
      if (this.pageIsOnTheRight(this.currentPage) && !this.otherPage(this.currentPage)) {
        to.x += this.pageWidth/2;
        if (pageIndex==(ltr ? lastPage : 0) && !this.otherPage(pageIndex)) {
          to.x += this.pageWidth/2;
        }
      }
      if (this.pageIsOnTheLeft(this.currentPage) && !this.otherPage(this.currentPage)) {
        to.x -= this.pageWidth/2;
        if (pageIndex==(ltr ? 0 : lastPage) && !this.otherPage(pageIndex)) {
          to.x -= this.pageWidth/2;
        }
      }
    }

    if (this._singlePage) {
      if (this.isOnPage(pageIndex)) {
        this.animating = true;
        this.slideX( this.pageIsOnTheLeft(pageIndex) ? 0 : -this.pageWidth, function(){
          book._cantStopAnimation = false;
          book.animating = false;
          book.showPage(pn, updateBrowserURL);
        });
        return pageIndex;
      }
      this.slideX( this.pageIsOnTheLeft(pageIndex) ? 0 : -this.pageWidth, function(){
        book.showPage(pn, updateBrowserURL);
      });
    }

    book.flip({
      from     : [from.x, from.y],
      to       : [to.x, to.y],
      easing   : easing,
      arc      : !isHolded,
      page     : page,
      back     : back,
      corner   : corner,
      complete : function(){
        book._cantStopAnimation = false;
        book.releasePage(page, false);
        book.showPage(pn, updateBrowserURL);
      }
    });

    return pageIndex;
  }, // gotoPage

  // direction: -1 | "left"  => goto left
  //             1 | "right" => goto right
  gotoDirection : function( direction, pageIndex ){
    if ( pageIndex==undefined ) pageIndex = this.currentPage;
    if ( direction=="left" )  direction = -1;
    if ( direction=="right" ) direction = 1;
    var delta = direction*( this._singlePage ? 1 : 2 );
    if ( this.rtl ) delta = -delta;
    return this.gotoPage( pageIndex + delta );
  }, // gotoDirection

  gotoLeft : function( pageIndex ){
    return this.gotoDirection( "left", pageIndex );
  }, // gotoLeft

  gotoRight : function( pageIndex ){
    return this.gotoDirection( "right", pageIndex );
  }, // gotoRight

  gotoLastLeft : function( pageIndex ){
    return this.gotoPage( this.rtl ? this.pages.length : 0 );
  }, // gotoLastLeft

  gotoLastRight : function( pageIndex ){
    return this.gotoPage( this.rtl ? 0 : this.pages.length );
  }, // gotoLastRight

  back : function(){
    return this.gotoPage( this.currentPage - (this._singlePage ? 1 : 2) );
  }, // back

  advance : function(){
    return this.gotoPage( this.currentPage + (this._singlePage ? 1 : 2) );
  }, // advance

  leftPage : function(pageIndex){
    if (pageIndex===undefined) pageIndex = this.currentPage;
    return this.pages[ this.leftPageIndex(pageIndex) ] || null;
  }, // leftPage

  leftPageIndex : function(pageIndex){
    if (pageIndex==null) return;
    if (this.pageIsOnTheRight(pageIndex)) pageIndex += (this.rtl ? 1 : -1);
    if (pageIndex<0 || pageIndex>this.pages.length-1) pageIndex=null;
    return pageIndex;
  }, // leftPageIndex

  rightPage : function(pageIndex){
    if (pageIndex===undefined) pageIndex = this.currentPage;
    return this.pages[ this.rightPageIndex(pageIndex) ] || null;
  }, // rightPage

  rightPageIndex : function(pageIndex){
    if (pageIndex==null) return;
    if (this.pageIsOnTheLeft(pageIndex)) pageIndex += (this.rtl ? -1 : 1);
    if (pageIndex<0 || pageIndex>this.pages.length-1) pageIndex=null;
    return pageIndex;
  }, // rightPageIndex

  pageIsOnTheRight : function(pageIndex) {
    return !this.pageIsOnTheLeft(pageIndex);
  }, // pageIsOnTheRight

  pageIsOnTheLeft : function(pageIndex) {
    var onLeft = !(pageIndex%2); // by "default" even pages are on left side
    if (this.closable) onLeft=!onLeft;
    if (this.rtl) onLeft=!onLeft;
    return onLeft;
  }, // pageIsOnTheLeft

  otherPage : function(pageIndex) {
    var add = this.pageIsOnTheLeft(pageIndex) ? 1 : -1;
    if (this.rtl) add = -add;
    pageIndex += add;
    if (pageIndex<0 || pageIndex>this.pages.length-1) pageIndex=null;
    return pageIndex;
  }, // otherPage

  isOnPage:function(pageIndex) {
    return (typeof pageIndex==='number') &&
           (pageIndex===this.currentPage || pageIndex===this.otherPage(this.currentPage));
  }, // isOnPage

  backPage: function(pageIndex) {
    if (!this.pages[pageIndex]) return null;
    var add = (pageIndex%2 ? 1 : -1);
    pageIndex += this.closable ? -add : add;
    return this.pages[pageIndex];
  }, // backPage

  pageBelow: function(pageIndex) {
    pageIndex = parseInt(pageIndex, 10);
    if ( pageIndex!=pageIndex ) return null // if pageIndex is NaN
    var below = pageIndex + ( this.pageIsOnTheLeft(pageIndex)!=this.rtl ? -2 : 2);
    if (below<0 || below>this.pages.length-1) below=null;
    return below;
  }, // pageBelow

  pageType: function(pageIndex){
    var page;
    page = (typeof pageIndex==='number') ? this.pages[pageIndex] : pageIndex;
    return page.isHardPage ? "hard" :
           page.find('.wowbook-page-content.wowbook-basic-page').length ? "basic" : "soft";
  },

  calculateOpacity : function(value, max, thresholdMin, thresholdMax) {
    if (value<=thresholdMin || value>=(max-thresholdMin) )  return 0;
    if (value>=thresholdMax && value<=(max-thresholdMax) )  return 1;
    var d=thresholdMax-thresholdMin;
    if (value > thresholdMax) value = max-value; // upper bands
    return (value-thresholdMin)/d;
  }, // calculateOpacity

  //
  //
  // Slideshow methods
  //
  //
  startSlideShow : function(){
    this.slideShowRunning = true;
    this.advanceAfterTimeout(this.slideShowDelay);
    this.toggleControl( "slideshow", true);
  }, // startSlideShow

  advanceAfterTimeout : function(delay){
    var book=this;
    this.slideShowTimer = setTimeout(function(){
      if ( book.animating || book.holdedPage ) { book.advanceAfterTimeout( 100 ); return };
      var inLastPage = book.isOnPage( book.pages.length-1 );
      if ( book.opts.slideShowLoop && inLastPage ) {
        book.gotoPage(0);
      } else {
        book.advance();
      }

      if ( book.opts.slideShowLoop || !inLastPage ) {
        book.advanceAfterTimeout( book.slideShowDelay+book.turnPageDuration );
      } else {
        book.stopSlideShow();
      }
    }, delay);
  }, // advanceAfterTimeout

  stopSlideShow : function( pausingOnHover ){
    clearTimeout( this.slideShowTimer );
    this.slideShowTimer = undefined;
    this.slideShowRunning = false;
    if ( !pausingOnHover ) this.toggleControl( "slideshow", false);
  }, // stopSlideShow

  //
  // toggleSlideShow
  //
  toggleSlideShow : function(){
    this.slideShowRunning ? this.stopSlideShow() : this.startSlideShow()
  }, // toggleSlideShow


  //
  //
  // Sections
  //
  //
  findSections : function(s){
    if (s) this.sectionDefinition = s;
    var sectionDef = this.sectionDefinition,
      sections = [],
        section;

    if (typeof(sectionDef)==='string') {
      section  = sectionDef;
      sectionDef = [];
      $(section, this.elem).each(function(i,e){
        sectionDef.push([ '#'+e.id, $(e).html() ]);
      });
    }
    if ($.isArray(sectionDef)) {
      for(var i=0, l=sectionDef.length; i<l; i++) {
        section = sectionDef[i];
        if (typeof(section)==='string') {
          try { section = [section, $(section, this.elem).html()]; }
          catch(e) {
            //this.log("Something wrong happened at the function 'findSections' (maybe you have passed a invalid jquery selector?) :<br/>&nbsp;&nbsp;"+e)
            continue;
          }
        }
        try { section[2] = this.selectorToPage(section[0]); }
        catch(e){
            //this.log("Something wrong happened at the function 'findSections' (maybe you have passed a invalid jquery selector?) :<br/>&nbsp;&nbsp;"+e)
            continue;
        }
        if (section[2]===undefined) continue;
        sections.push({ id: section[0], title: section[1], page: section[2] });
      }
      sections = sections.sort(function(a,b){ return a.page-b.page });
    }
    this.sections = sections;
    return sections;
  }, // findSections


  /*
   * method pageToSection
   *
   * returns the section that the given page belongs
   *
   * params
   *    pageIndex : index of the page
   *
   * returns
   *    an object containing the section info.
   */
  pageToSection : function(pageIndex){
    var sections = this.sections,
      section;
    for(var i=0,l=sections.length; i<l; i++){
      if (sections[i].page > pageIndex) break;
      section=sections[i];
    }
    return section;
  },

  /*
   * method currentSection
   *
   * returns the section that is being showed in the book
   *
   */
  currentSection : function(){
    return this.pageToSection(this.currentPage);
  }, // currentSection

  //
  // TOC
  //
  // Experimental, use at your own risk!
  //
  fillToc : function(element, template){
    var toc = $(element || this.opts.toc),
        sections, section, item,
        wrapper = '';
    if (toc.length===0) return;

    sections = this.sections;
    if (typeof(template)==='undefined') template = this.opts.tocTemplate;

    if (!template) {
      wrapper  = (toc.is('UL, OL')) ? '<li>' : '<div>';
      template = '<a href="${link}">${section}</a>';
    }

    for(var i=0, l=sections.length; i<l; i++) {
      section = sections[i];
      item = template.replace(/\$\{link\}/g, '#'+this.id+'/'+section.id.substr(1))
        .replace(/\$\{section\}/g, section.title )
        .replace(/\$\{page\}/g, section.page );
      $(item).appendTo(toc).wrap(wrapper);
    }
  }, // fillToc

  createToc: function( items ){
    var toc  = this.opts.toc || items || [];
    this.tocContainer = $("<div class='wowbook-toc' style='display:none'>").prependTo( $(this.opts.tocParent || "body") );
    var container = this.tocContainer;

    // title and close button
    container.append("<h1>"+this.opts.tocHeader+"<button class='wowbook-close'>&#10005;</button></h1>");
    this.controllify({ "toc": container.find(".wowbook-close") });

    // items
    var book=this;

    var itemList = $("<ul class='wowbook-toc-items'>").appendTo( container );
    this.createTocItemList( toc, itemList );

    itemList.on("click", ".wowbook-toc-item-toggle", function(){
      $(this).parent().toggleClass("wowbook-collapsed");
    });

    this.setStyle( this.opts.styles || this.opts.style );
  }, // createToc

  createTocItemList: function( items, container ){
    var book = this,
        item,
        domItem;
    for(var i=0,l=items.length;i<l;i++){
      item = items[i];
      domItem = this.createTocItem( item[0], item[1] ).appendTo( container );
      if ( item[3] ) { // pdf link
        domItem.find("a").on("click", {dest: item[3]}, function( evt ){
          evt.preventDefault();
          book.pdfNavigateTo( evt.data.dest );
        });
      }
      if ( item[2] && item[2].length ){
        if ( item[1]===null && item[3]===null ) {
          domItem.find("a").on("click", function( evt ){
            $(this).parent().find(".wowbook-toc-item-toggle").trigger("click");
            evt.preventDefault();
          });
        }
        domItem.addClass("wowbook-collapsed");
        $("<span class='wowbook-toc-item-toggle'></span>").prependTo( domItem );
        var subList = $("<ul class='wowbook-toc-items'>").appendTo( domItem );
        this.createTocItemList( item[2], subList );
      }
    }

  }, // createTocItemList

  createTocItem : function( title, link ){
    var template = this.opts.tocItemTemplate ||
                   '<li class="wowbook-toc-item"><a href="${link}">${title}<span class="page">${page}</span></a></li>';
    var item, page = "";
    if ( $.isNumeric(link) ) {
      page = link;
      link = this.pageToLocationHash( link );
    }
    if ( link===null || link===undefined ) link="";
    item = template.replace(/\$\{link\}/g, link)
                   .replace(/\$\{title\}/g, title )
                   .replace(/\$\{page\}/g, page );
    return $(item);
  }, // createTocItem

  destroyToc : function(){
    this.tocContainer && this.tocContainer.remove();
    this.tocContainer = null;
  }, // destroyToc

  showToc : function(duration){
    if (!this.tocContainer || !this.tocContainer.length) this.createToc();
    this.tocContainer.fadeIn(duration);
  },

  hideToc : function(duration){
    this.tocContainer.fadeOut(duration);
  },

  toggleToc : function(duration){
    $(this.tocContainer).is(':visible') ? this.hideToc(duration) : this.showToc(duration);
  },


  // Converts a windows.location.hash into a page index
  // that matches that hash
  // #bookid/numberX    => page index X
  // #bookid/elementID  => index of the page that contains element with id elementID
  // #bookid/elementID/numberX => index of the page that contains element with id elementID PLUS numberX
  locationHashToPage : function(hash, pqp) {
    if (hash===undefined) hash=window.location.hash;
    if (hash=='#'+this.id+"/") return 0;
    hash = hash.slice(1).split("/");
    if (hash[0]!==this.id) return;
    if (hash.length===1) return 0;
    var page = parseInt(hash[1]);
    if (!isNaN(page)) return Math.max(page-1, 0);
    page = this.selectorToPage('#'+hash[1]);
    if (page===undefined) return 0;
    if (!isNaN(hash[2])) page += Math.max(parseInt(hash[2])-1, 0);
    return +page;
  }, // locationHashToPage

  // Converts a page index into a windows.location.hash
  // without sections : page index X => #bookid/pageIndexX
  // with    section  : page index X => #bookid/sectionID/offset-page-in-the-section
  pageToLocationHash : function(pageIndex) {
    var hash    = '',
      offset  = pageIndex+1,
      section = this.pageToSection(pageIndex);
    if (section) {
      hash   += '/'+section.id.replace('#','');
      offset -= section.page;
    }
    if (offset>1) hash += '/'+offset;
    return '#'+this.id+( hash || '/');
  }, // pageToLocationHash

  // return the pageIndex that contains the jquery selector
  selectorToPage : function(selector) {
    var e=$(selector, this.elem).closest('.wowbook-page');
    if (e.length) return +e.data('pageIndex');
  }, // selectorToPage

  getLocationHash : function(){
    return window.location.hash.slice(1);
  }, // getLocationHash

  locationEndsInHash : function(href){
    if (href===undefined) href= window.location.href;
    return href.lastIndexOf("#")==href.length-1;
  }, // locationEndsInHash


  //
  // Zoom
  //
  zoomSetup : function(){
    this._zoomOffset = { dx: 0, dy: 0 };
    this._cssZoom = this._cssZoom || 1;
    this.zoomLevel = 1;
    this.detectBestZoomMethod();
    this.zoomTouchSupport();
    this.toggleControl("zoomIn",  this.zoomLevel==this.zoomMax );
    this.toggleControl("zoomOut", this.zoomLevel==this.zoomMin );
    this.toggleControl("zoomReset", this.zoomLevel==1 );

    if ( this.opts.doubleClickToZoom ) {
      var book=this;
      this.elem.on("dblclick", function( evt ){
        var o = book.elem.offset(),
            event = evt,
            x = event.pageX-o.left,
            y = event.pageY-o.top;
        if ( !book.zoomed ) {
          book.zoomIn( 1, {x: x, y: y} );
        } else {
          book.zoomReset();
        }
      })
    }

  }, // zoomSetup

  _zoomUpdateOnRAF: function(){
    if ( !this._zoomDataRAF ) return;
    var zoptions = $.extend({}, this._zoomDataRAF.options),
        target = this._zoomDataRAF.options.offset;
    if (target) {
        var currentOffset = this._zoomOffset,
            deltaX = target.dx-currentOffset.dx,
            deltaY = target.dy-currentOffset.dy;
      zoptions.offset = {
        dx : currentOffset.dx+deltaX*0.2,
        dy : currentOffset.dy+deltaY*0.2
      }
    }
    var level = this._zoomDataRAF.level || this.zoomLevel;
    if ( level!=this.zoomLevel ) {
        level = this.zoomLevel+ (level-this.zoomLevel)*0.2;
    }
    zoptions.transform = true;
    this._zoom( level, zoptions )
    if (target && (Math.abs(deltaX)<1 && Math.abs(deltaY)<1) && (Math.abs(this.zoomLevel-level)<1)) {
      if (this._zoomDataRAF.callback) this._zoomDataRAF.callback.call(this);
      this._zoomDataRAF = null;
    }
  }, // _zoomUpdateOnRAF

  _zoom : function(level, options){
    if (!options) options={};

    var x = (options.x!=undefined ? options.x : this.pageWidth*this.currentScale),
        y = options.y || 0;

    this._zoomOffset = options.offset || this.zoomFocusOffset( level, x, y );
    this.zoomLevel = level;
    var useTransform = options.transform || this.opts.zoomUsingTransform,
        newLevel    = level*this.currentScale,
        zoomFix     = $.browser.ie7 ? 1 : (useTransform ? this._cssZoom : newLevel),
        zoomWindow  = this.zoomWindow,
        zoomContent = this.zoomContent,
        boundingBox = $(this.zoomBoundingBox),
      bbWidth  = boundingBox.outerWidth(),
      bbHeight = boundingBox.outerHeight();

    // zoomWindow with the same size and position than bounding box
    var zwo = zoomWindow.offset(),
        zwp = zoomWindow.position(),
        bbo = boundingBox[0]!==window ? boundingBox.offset() : { left: boundingBox.scrollLeft(), top: boundingBox.scrollTop() };
    zoomWindow.css({
      width  : bbWidth,
      height : bbHeight
    })
    var dLeft = bbo.left-zwo.left,
        dTop = bbo.top-zwo.top;
    if (dLeft) {
      dLeft += parseFloat(zoomWindow.css("marginLeft"));
      zoomWindow.css("marginLeft", dLeft);
      zoomContent.marginLeft = dLeft;
    }
    if (dTop) {
      dTop += parseFloat(zoomWindow.css("marginTop"));
      zoomWindow.css("marginTop", dTop);
      zoomContent.marginTop = dTop;
    }
    var transform = "",
        offsetX   = this._zoomOffset.dx/zoomFix,
        offsetY   = this._zoomOffset.dy/zoomFix;

    if ($.wowBook.support.transform && (offsetX || offsetY)) {
      transform = $.wowBook.utils.translate( offsetX, offsetY);
    } else {
      zoomContent.css({ left: offsetX, top: offsetY });
    }

    if (useTransform) {
      var scale = newLevel/zoomFix;
      transform += this.opts.useScale3d ? "scale3d("+scale+","+scale+",1)"
                                        : "scale("+scale+")"
    } else {
      this._cssZoom = newLevel;
      zoomContent.css('zoom', newLevel);
      zoomContent.css("marginLeft", -zoomContent.marginLeft/zoomFix );
      zoomContent.css("marginTop", -zoomContent.marginTop/zoomFix );
    }

    if ($.wowBook.support.transform) zoomContent.css('transform', transform);

    if (this.zoomLevel!==1) {
      if (!this.zoomed) {
        // zoom started now
        zoomContent.css("marginLeft", -zoomContent.marginLeft/zoomFix );
        zoomContent.css("marginTop", -zoomContent.marginTop/zoomFix );
        if (useTransform) zoomContent.css('transformOrigin', "0 0");

        this.elem.find("img").each(function(){
          var img=$(this);
          img.data("wowbook-draggable-before-zoom", img.attr("draggable") );
          img.attr("draggable", false);
        });
      }
      // zoom changing

    } else {
      // zoom finished
      this.zoomFinished();
    }

    this.zoomed = (level!==1);
    zoomContent.toggleClass('wowbook-draggable', this.zoomed);
    this.toggleControl("zoomIn",  this.zoomLevel==this.zoomMax );
    this.toggleControl("zoomOut", this.zoomLevel==this.zoomMin );
    this.toggleControl("zoomReset", this.zoomLevel==1 );
  }, // _zoom

  zoom : function(level, duration, options){
    this.uncurl(true);
    for(var i=0,l=this.pages.length;i<l;i++) if (this.pages[i].data('holdedAt')) return;

    if ($.isPlainObject(duration)) { options=duration; duration=options.duration; }
    if (!options) options={}

    if (level<=this.zoomMin && !options.resetting) return this.zoomReset(duration, options);
    if (level>this.zoomMax) level=this.zoomMax;
    if (level===this.zoomLevel && !options.force) return;

    if (duration==undefined) duration = this.opts.zoomDuration;
    if (duration==0) {
      this._zoom(level, options);
      if (options.callback) options.callback.apply(this)
      if ( this.pdf ) this.pdfUpdateRender();
      if (this.onZoom) this.onZoom(this);
      return;
    }

    var webkit = !this.opts.zoomUsingTransform &&  $.wowBook.support.transform;

    if (this._zoomAnimating) {
      $(this).stop();
      if (webkit) {
        this.zoomContent.css('transform', "" );
      }
    }

    this._zoomAnimating = this.zoomLevel;

    var book = this,
        x = options.x,
        y = options.y || 0;

    if (x==undefined) {
      x = ( this._singlePage ? this.pageWidth/2 : this.pageWidth )*this.currentScale;
    }
    var o = { x: x, y: y, offset: { dx: 0, dy: 0 } },
        initialOffset = $.extend( { dx: 0, dy: 0 }, this._zoomOffset ),
        finalOffset   = options.offset || this.zoomFocusOffset( level, x, y ),
        dx = finalOffset.dx-initialOffset.dx,
        dy = finalOffset.dy-initialOffset.dy;

    if (webkit){
      o.transform = true;
      if (this._isMobile) {
        if (this.leftPage())  this.leftPage().css("-webkit-transform", "translateZ(0)" )
        if (this.rightPage()) this.rightPage().css("-webkit-transform", "translateZ(0)" )
      }
    }

    $(this).animate({ _zoomAnimating: level }, {
      duration : duration,
      easing   : options.easing || this.opts.zoomEasing,
      complete : function(){
        book._zoomAnimating = false;
        book._zoom( level )
        if (options.callback) options.callback.apply(this)
        if ( this.pdf ) this.pdfUpdateRender();
        if (book.onZoom) book.onZoom(book);
      },
      step:function(e, t){
        o.offset.dx = initialOffset.dx + dx*t.pos;
        o.offset.dy = initialOffset.dy + dy*t.pos;
        book._zoom( e, o )
      }
    })
  }, // zoom

  zoomFinished : function(){
    this.zoomWindow.css({
      overflow : 'visible',
      width  : this.zoomContent.width()*this.currentScale,
      height : this.zoomContent.height()*this.currentScale,
      marginLeft : 0,
      marginTop  : 0
    });
    this.zoomContent.css({
      left       : 0,
      top        : 0,
      marginLeft : 0,
      marginTop  : 0
    });
    this._zoomOffset = { dx: 0, dy: 0 };

    this.elem.find("img").each(function(){
      var img=$(this);
      if ( img.data("wowbook-draggable-before-zoom") == undefined ) {
        img.removeAttr("draggable");
      } else {
        img.attr("draggable", img.data("wowbook-draggable-before-zoom"));
      }
    });
  }, // zoomFinished

  zoomReset : function(duration, options){
    if ($.isPlainObject(duration)) { options=duration; duration=options.duration; }
    if (!options) options={}

    this._zoomDataRAF = null;
    options.offset = { dx: 0, dy: 0 };
    options.resetting = true;
    options.force = true;
    options.callback = function(){
      this.zoomContent.css({ left: 0, top: 0 });
      this.zoomed = false;
    }
    this.zoom(1, duration, options);
  }, // zoomReset

  zoomIn : function(step, options){
    if ($.isPlainObject(step)) { options=step; step=undefined }
    this.zoom(this.zoomLevel + (step || this.zoomStep), options);
  },

  zoomOut : function(step, options){
    if ($.isPlainObject(step)) { options=step; step=undefined }
    this.zoom(this.zoomLevel - (step || this.zoomStep), options);
  },

  zoomFocusOffset : function( newZoom, x, y, offset, currentZoom ){
    if (!offset) offset = this._zoomOffset || { dx: 0, dy: 0 };
    offset = $.extend({ dx: 0, dy: 0 }, offset);
    var dx = offset.dx || 0,
        dy = offset.dy || 0,
        f  = newZoom/(currentZoom || this.zoomLevel),
        xt, yt;
    x  = x-dx; y = y-dy;
    xt = x*f;
    yt = y*f;
    offset.dx = dx -(xt-x)
    offset.dy = dy -(yt-y)
    return { dx: dx -(xt-x), dy: dy -(yt-y) };
  }, // zoomFocusOffset

  zoomTouchSupport : function(){
    if (!this.opts.touchEnabled) return;

    // for some reason, hammerjs isn't working with IE8/7
    // this is a workaround until the problem is fixed
    if ($.browser.ie8mode || $.browser.ie7) return this.zoomDragSupportForIE();

    var book = this,
        bookOffset, dragStart, pinchStart;

    book._hammer = new Hammer(book.zoomContent[0], book.opts.touch );
    var hammer = book._hammer;
    // pan
    hammer.on("panstart pinchstart", function(evt){
      book.zoomContent.addClass("wowbook-dragging");
    });
    hammer.on("hammer.input", function(evt){
      if ( !book.zoomContent.hasClass("wowbook-draggable") ) return;
      if ( $(evt.target).is("img") && evt.srcEvent.type=="mousedown" ) {
        evt.preventDefault();
      }
      if (!(evt.isFinal && book.zoomContent.hasClass("wowbook-dragging"))) return;
      pinchStart = null;
      dragStart  = null;
      book.zoomContent.removeClass("wowbook-dragging");
      var level = book.zoomLevel;
      var zoomData = book._zoomDataRAF;
      var targetLevel = zoomData ? zoomData.level : level;
      if (( targetLevel < book.zoomMin ) ||
          ( targetLevel == book.zoomMin && (book._zoomOffset.dx || book._zoomOffset.dy) )) {
        if (zoomData) {
          zoomData.callback = function(){ book.zoomReset(); }
        } else {
          book.zoomReset();
        }
      } else {
        book._zoom( level, { force: true, offset: book._zoomOffset });
        if ( book.pdf ) book.pdfUpdateRender();
      }
    });
    hammer.on('panstart panmove', function(evt) {
      if (!book.zoomed) return;
      evt.preventDefault();
      pinchStart = null;
      if (!dragStart) {
        dragStart = {
          offset  : $.extend({}, book._zoomOffset),
          pageX : evt.center.x,
          pageY : evt.center.y
        }
      }

      var dx = dragStart.offset.dx + (evt.center.x-dragStart.pageX),
          dy = dragStart.offset.dy + (evt.center.y-dragStart.pageY);
      book._zoomDataRAF = {
        level: book.zoomLevel,
        options: { force: true, offset: { dx: dx, dy: dy } }
      }

    });
    hammer.on('pinchmove pinchstart', function(evt) {
      evt.preventDefault();
      dragStart = null;
      var pageX = evt.center.x, pageY = evt.center.y;
      if (!pinchStart) {
        if (book.currentFlip && !book.currentFlip.finished) {
          return;
        }
        bookOffset = book.elem.offset();
        pinchStart = {
          level   : book.zoomLevel,
          pageX   : pageX,
          pageY   : pageY,
          x       : pageX-bookOffset.left,
          y       : pageY-bookOffset.top,
          offset  : $.extend({}, book._zoomOffset),
          useTransform : book.opts.zoomUsingTransform
        }
      }
      var newLevel = pinchStart.level*evt.scale;
      if (newLevel>book.zoomMax) newLevel=book.zoomMax;
      var offset = book.zoomFocusOffset( newLevel, pinchStart.x, pinchStart.y, pinchStart.offset, pinchStart.level );
      offset.dx += (pageX-pinchStart.pageX);
      offset.dy += (pageY-pinchStart.pageY);
      book._zoomDataRAF = {
        level: newLevel,
        options: { force: true, offset: offset }
      }
    });
    if (book.opts.pinchToZoom) {
      hammer.get('pinch').set({ enable: true });
      hammer.get('pinch').recognizeWith("pan");
    }
    if ( this.opts.doubleClickToZoom ) {
      hammer.get("doubletap").set({ posThreshold: 50 })
      hammer.on("doubletap", function( evt ){
        evt.preventDefault();
        var o = book.elem.offset(),
            x = evt.center.x-o.left,
            y = evt.center.y-o.top;
        if ( !book.zoomed ) {
          book.zoomIn( 1, {x: x, y: y} );
        } else {
          book.zoomReset();
        }
      })
    }
  }, // zoomTouchSupport


  // for some reason, hammerjs isn't working with IE8/7
  // this is a workaround until the problem is fixed
  zoomDragSupportForIE : function(){
    var book=this;
    var dragStart;

    var mousedownhandler =  function(evt){
      if (!book.zoomed) return;
      dragStart = {
        offset  : $.extend({}, book._zoomOffset),
        pageX : evt.pageX,
        pageY : evt.pageY
      }
      $(document)
         .bind('mousemove.wowbook', mousemoveHandler)
         .bind('mouseup.wowbook',   mouseupHandler);
      return false;
    } // mousedownhandler

    var mousemoveHandler =  function(evt){
      var dx = dragStart.offset.dx + (evt.pageX-dragStart.pageX),
          dy = dragStart.offset.dy + (evt.pageY-dragStart.pageY);
      book._zoomDataRAF = {
        level: book.zoomLevel,
        options: { force: true, offset: { dx: dx, dy: dy } }
      }
      return false;
    } // mousemoveHandler

    var mouseupHandler =  function(e){
      var level = book.zoomLevel;
      if (( level < book.zoomMin ) ||
          ( level == book.zoomMin && (book._zoomOffset.dx || book._zoomOffset.dy) )) {
        book.zoomReset();
      }
      $(document).unbind('mousemove.wowbook', mousemoveHandler);
      $(document).unbind('mouseup.wowbook',   mouseupHandler);
    } // mouseupHandler

    book.zoomContent.bind("mousedown.wowbook", mousedownhandler);
  }, // zoomDragSupportForIE


  // detect if we should use CSS zoom or CSS transform to zoom
  detectBestZoomMethod : function(supportTransform, supportZoom, ie8mode){
    if ( this.opts.zoomUsingTransform!=undefined ) return !this.opts.zoomUsingTransform ? "zoom" : "transform";
    if (supportTransform===undefined) supportTransform = $.wowBook.support.transform;
    if (supportZoom===undefined) supportZoom = $.wowBook.support.zoom;
    if (ie8mode===undefined) ie8mode = $.browser.ie8mode;
    var isWebkit = $.browser.chrome || $.browser.webkit || $.browser.safari || $.browser.opera;
    var useZoom = isWebkit || ie8mode || !supportTransform;
    this.opts.zoomUsingTransform = !useZoom;
    return useZoom ? "zoom" : "transform";
  }, // detectZoomMethod


  //
  // Fullscreen
  //
  setupFullscreen : function(){
    if (_requestFullscreen) {
      var book=this,
          changeEvents = "fullscreenchange mozfullscreenchange webkitfullscreenchange MSFullscreenChange ",
          errorEvents = "fullscreenerror mozfullscreenerror webkitfullscreenerror MSFullscreenError ";
      changeEvents = changeEvents.replace(/ /g, ".wowbook ");
      errorEvents = errorEvents.replace(/ /g, ".wowbook ");
      this._fullscreenChangeHandler = function(){
        var fullscreenEnabled = !!fullscreenElement();
        $(book.opts.fullscreenElement).toggleClass("fullscreen wowbook-fullscreen-fix", fullscreenEnabled);
        book.elem.toggleClass("fullscreen", fullscreenEnabled);
        book.toggleControl("fullscreen", fullscreenEnabled);
      }
      $(document).on(changeEvents, this._fullscreenChangeHandler);

      this._fullscreenErrorHandler = function(){
        var result;
        if ( book.opts.onFullscreenError ) result=book.opts.onFullscreenError.apply(this, arguments);
        if ( result===false ) return;
        if ( typeof(result)=="string" ) { alert( result ) }
        else { if ( book.opts.onFullscreenErrorMessage ) alert( book.opts.onFullscreenErrorMessage ); }
      }
      $(document).on(errorEvents, this._fullscreenErrorHandler);
    } else {
      $("html").addClass("no-fullscreen");
    }
  }, // setupFullscreen

  enterFullscreen : function(elem){
    requestFullscreen( $(elem || this.opts.fullscreenElement)[0] );
  }, // enterFullscreen

  exitFullscreen : function(){
    exitFullscreen();
  }, // enterFullscreen

  toggleFullscreen : function(){
    fullscreenElement() ? this.exitFullscreen() : this.enterFullscreen();
  }, // toggleFullscreen


  //
  // Book Shadow
  //
  positionBookShadow : function(){
    var pageLength = this.pages.length,
        show = !!(this.opts.bookShadow && pageLength && !(pageLength<3 && this.holdedPage));
    this.bookShadow.toggle(show);
    if (!show) return;

    var pw  = this.pageWidth,
        hbp = this.holdedPageBack,
        liftingLastPageOnLeft  = !!hbp && hbp.onRight && (hbp.pageIndex == (this.rtl? pageLength-1 : 0)),
        liftingLastPageOnRight = !!hbp && hbp.onLeft  && (hbp.pageIndex == (this.rtl? 0 : pageLength-1)),
        noPageOnLeft   = !this.leftPage()  || liftingLastPageOnLeft,
        noPageOnRight  = !this.rightPage() || liftingLastPageOnRight,
        onePageVisible = noPageOnLeft != noPageOnRight;
    if (noPageOnLeft && noPageOnRight) { this.bookShadow.hide(); return; }

    var correction = this.opts.zoomUsingTransform ? this.currentScale*this.zoomLevel : 1;
    var containerLeft = this.elem.is(":visible") ? this.pagesContainer.position().left
                                                 : parseFloat( this.pagesContainer.css('left') ) || 0;

    this.translate( this.bookShadow, ((noPageOnLeft ? pw : 0)) + containerLeft/correction, 0 );
    this.bookShadow.css({
      width : onePageVisible ? pw : pw*2
    });
  }, // positionBookShadow


  //
  // Page flip sound
  //
  playFlipSound : function(){
    if (!this.flipSound) return;
    var c=this.opts.onPlayFlipSound;
    if ($.isFunction(c) && (c(this)===false)) return;
    if (!this.audio) this.audio = this.createAudioPlayer();
    if (this.audio && this.audio.play) this.audio.play();
  }, // playFlipSound

  toggleFlipSound : function(enabled){
    if (!arguments.length) enabled = !this.flipSound
    this.flipSound = enabled
    this.toggleControl("flipSound", !enabled)
  }, // toggleFlipSound

  createAudioPlayer : function(path, files){
    if (!path)  path  = this.opts.flipSoundPath;
    if (!files) files = this.opts.flipSoundFile;
    var srcs = [];
    for (var i=0, l=files.length; i<l; i++)
      srcs.push('<source src="'+path+files[i]+'">');
    return $('<audio preload>'+srcs.join('')+'</audio>')[0];
  }, // createAudioPlayer


  //
  // Touch
  //
  _untouch : function(e){
    return (e.originalEvent.touches && e.originalEvent.touches[0]) || e;
  },

  touchSupport:function(){
    var book=this;
    book.elem.bind('touchstart.wowbook', function(e){
      var touches = e.originalEvent.touches;
      if (touches.length>1) return;
      book._touchStarted = {
        x         : touches[0].pageX,
        y         : touches[0].pageY,
        timestamp : e.originalEvent.timeStamp,
        inHandle  : $(e.target).hasClass('wowbook-handle')
      }
      if (book._touchStarted.inHandle) book.pageEdgeDragStart( book._untouch(e) );
    });
    $(document).on('touchmove.wowbook', function(e){
      if (!book._touchStarted) return;
      var touches = e.originalEvent.touches;
      book._touchEnded = {
        x         : touches[0].pageX,
        y         : touches[0].pageY,
        timestamp : e.originalEvent.timeStamp
      }
      if (book._touchStarted.inHandle) return book.pageEdgeDrag( book._untouch(e) );
      var dx = book._touchEnded.x-book._touchStarted.x;
      var dy = book._touchEnded.y-book._touchStarted.y;

      if (book.opts.allowDragBrowserPageZoom) {
        var zoom = document.documentElement.clientWidth / window.innerWidth;
        if (zoom!=1) return;
      }
      e.preventDefault();
    });
    $(document).on('touchend.wowbook touchcancel.wowbook', function(e){
      if (!book._touchStarted) return;
      if (!book._touchEnded && $(e.target).hasClass('wowbook-handle')){
        var g = $(e.target).data('corner');
        if (g==='r') book.gotoRight();
        if (g==='l') book.gotoLeft();
      }

      var _touchStarted = book._touchStarted,
          _touchEnded   = book._touchEnded || book._touchStarted;
      book._touchStarted = null;
      book._touchEnded   = null;
      if (book.zoomed) return;
      if (_touchStarted.inHandle) {
        book.pageEdgeDragStop({ pageX: _touchEnded.x });
        return false;
      }
      var dx = _touchEnded.x-_touchStarted.x;
      var dy = _touchEnded.y-_touchStarted.y;
      var dt = _touchEnded.timestamp-_touchStarted.timestamp;
      if (Math.abs(dx)<20 || dt>book.opts.swipeDuration ) return
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx<0) book.gotoRight()
        else book.gotoLeft()
        return false;
      }
    });
  }, // touchSupport

  //
  // Page edge drag
  //
  pageEdgeDragStart : function(e){
    if (this.zoomed) return;
    if ((this.animating && !this.curledPage) || (!$(e.target).hasClass('wowbook-handle'))) return false;
    var book = this,
        o    = book.origin.offset();
    if ( !this.opts.zoomUsingTransform ) {
      o.left = o.left*this.currentScale;
    }
    book.elem.addClass("wowbook-unselectable");


    book.mouseDownAtLeft  = ((e.pageX-o.left)/this.currentScale < book.pageWidth);
    book.pageGrabbed      = (book.mouseDownAtLeft ? book.leftPage() : book.rightPage());

    if (!book.pageGrabbed) return false;
    this.uncurl(true)
    book.pageGrabbedOffset = book.pageGrabbed.offset();

    book._dragging = true;
    if (this.opts.zoomUsingTransform) {
      book.pageGrabbedOffset.left = book.pageGrabbedOffset.left/this.currentScale;
      book.pageGrabbedOffset.top  = book.pageGrabbedOffset.top/ this.currentScale;
    }

    var x = (e.pageX/this.currentScale - this.pageGrabbedOffset.left),
        y = (e.pageY/this.currentScale - this.pageGrabbedOffset.top);

    this.stopAnimation(false)
    var corner = (book.mouseDownAtLeft ? "l" : "r");
    this.holdPage(this.pageGrabbed, x, y);
    this.flip(x, y, this.pageGrabbed, { corner: corner });

    $(document)
       .bind('mousemove.wowbook', function(e){ return book.pageEdgeDrag(e) })
       .bind('mouseup.wowbook',   function(e){ return book.pageEdgeDragStop(e) });
    return false;
  }, // pageEdgeDragStart

  pageEdgeDrag : function(e){
    if (!this._dragging) return false;
    var x = (e.pageX/this.currentScale - this.pageGrabbedOffset.left),
        y = (e.pageY/this.currentScale - this.pageGrabbedOffset.top);

    var corner = (this.mouseDownAtLeft ? "l" : "r");

    this.stopAnimation(false)
    this.flip(x, y, this.pageGrabbed, { corner: corner, dragging: true});

    return false;
  }, // pageEdgeDrag

  pageEdgeDragStop : function(e){
    if (!this._dragging) return false;
    var book = this,
        o    = book.origin.offset();
    if ( !this.opts.zoomUsingTransform ) {
      o.left = o.left*this.currentScale;
    }
    var mouseUpX = (e.pageX-o.left)/this.currentScale,
        mouseUpAtLeft = ((e.pageX-o.left)/this.currentScale < book.pageWidth);

    book.elem.removeClass("wowbook-unselectable");

    if (!this._cantStopAnimation) this.stopAnimation(false);

    if (this._singlePage) {
      if (book.pageGrabbed.onLeft) {
        if ( mouseUpX > book.pageWidth/2 ) {
          if ( book.pageGrabbed.pageIndex == book.currentPage ) {
            this.rtl ? book.advance() : book.back();
          } else {
            var target = book.pageGrabbed.pageIndex + ( this.rtl ? 1 : -1 );
            this.gotoPage( target );
          }
        } else {
          book.releasePage(book.pageGrabbed, true);
        }
      } else{
        if ( mouseUpX < (book.pageWidth+book.pageWidth/2) ) {
          if ( book.pageGrabbed.pageIndex == book.currentPage ) {
            this.rtl ? book.back() : book.advance();
          } else {
            var target = book.pageGrabbed.pageIndex + ( this.rtl ? -1 : 1 );
            this.gotoPage( target );
          }
        } else {
          book.releasePage(book.pageGrabbed, true);
        }
      }
    } else {
      if (book.mouseDownAtLeft && !mouseUpAtLeft) {
        this.rtl ? book.advance() : book.back();
      } else if (!book.mouseDownAtLeft && mouseUpAtLeft) {
        this.rtl ? book.back() : book.advance();
      } else {
        book.releasePage(book.pageGrabbed, true);
      }
    }
    book._dragging = false;
    $(document).unbind('mousemove.wowbook mouseup.wowbook');
  }, // pageEdgeDragStop

  //
  // Curl
  //
  curl : function(page, bottom){
    if (this.curledPage || this.holdedPage || this.zoomed) return

    if (page==undefined) page = this.currentPage
    if (typeof page=="number" || typeof page=="string") page=this.pages[+page];
    if (!page || page.isCurled) return
    page.isCurled = true
    this.curledPage = page

    var onleft = this.pageIsOnTheLeft(page.pageIndex),
        x0 = onleft  ? 0 : this.pageWidth,
        x1 = x0 + this.opts.curlSize*(onleft ? 1 : -1),
        y0 = !bottom ? 2 : this.pageHeight-1,
        y1 = y0 + this.opts.curlSize*(!bottom ? 1 : -1),
        corner = (bottom ? "b" : "t") + (onleft ? "l" : "r");
    this.flip({
      from     : [x0, y0],
      to       : [x1, y1],
      corner   : corner,
      page     : page,
      duration : 400
    })
  }, // curl

  uncurl : function(page, dontAnimate){
    if (!this.curledPage) return

    if (page==true) dontAnimate=true, page=undefined;
    if (page==undefined) page = this.curledPage || this.currentPage
    if (typeof page=="number" || typeof page=="string") page=this.pages[+page];
    if (!page.isCurled) return

    this.stopAnimation(false)
    this.releasePage(page, !dontAnimate, undefined, 400)
    page.isCurled = false
    this.curledPage = null
  }, // uncurl


  //
  // Thumbnails
  //
  initThumbnails: function(){
    var opts = this.opts;
    this.thumbnails = [];
    this.thumbnailsContainer = $("<div class='wowbook-thumbnails'>").append(
      "<div class='wowbook-wrapper'>"+
      "<a class='wowbook-back wowbook-button wowbook-control wowbook-control-back'/>"+
      "<div class='wowbook-clipper'><ul></ul></div>"+
      "<a class='wowbook-next wowbook-button wowbook-control wowbook-control-next' />"+
      "</div>")
      .css('display', 'none')
      .css('transform', 'translateZ(0)')
      .appendTo($(opts.thumbnailsParent));
    var container = this.thumbnailsContainer;
    this.thumbnailsList    = container.find("ul");
    this.thumbnailsClipper = container.find(".wowbook-clipper");
    if (opts.thumbnailsContainerWidth) container.width( opts.thumbnailsContainerWidth )
    if (opts.thumbnailsContainerHeight) container.height( opts.thumbnailsContainerHeight )

    var position = opts.thumbnailsPosition;
    if (position=="left" || position=="right"){
      opts.thumbnailsVertical = true
      if (position=="right") container.css({
        position: 'absolute',
        left: 'auto',
        right: '0px' })
    }
    if (position=="top" || position=="bottom"){
      opts.thumbnailsVertical = false
      if (position=="bottom") container.css({
        position: 'absolute',
        top: 'auto',
        bottom: '0px' })
    }
    container.addClass(opts.thumbnailsVertical ? 'wowbook-vertical' : 'wowbook-horizontal')
    container.toggleClass('wowbook-closable', this.closable);

    var book=this;

    // Buttons
    var dimension = opts.thumbnailsVertical ? "height" : "width";

    this.thumbnailsBackButton = container.find('.wowbook-back.wowbook-button').click(function(){
      book._moveThumbnailsList( book.thumbnailsClipper[dimension]() );
    })
    this.thumbnailsNextButton = container.find('.wowbook-next.wowbook-button').click(function(){
      book._moveThumbnailsList( -book.thumbnailsClipper[dimension]() );
    })

    // when user click the buttons, the thumbnails slides.
    // ipad need this for a more smooth movement
    this.thumbnailsClipper.css('transform', 'translateZ(0)')

    if ( this.scrollBarWidth()==0 ) this.thumbnailsClipper.css("overflow", "auto");
  }, // thumbnails

  destroyThumbnails : function(){
    this.thumbnailsContainer && this.thumbnailsContainer.remove()
    this.thumbnailsContainer = null
    this._thumbnailsPos = null;
    this.thumbnails = null
  }, // destroyThumbnails

  scrollBarWidth : function(){
    var div = $("<div style='display: inline-block;position: absolute;left:-1000px;'>Hi!</div>").appendTo("body"),
        before = div.width();
    div.css("overflow", "scroll");
    var after = div.width();
    div.remove();
    return after-before;
  }, // scrollBarWidth

  createThumbnails : function(){
    if (!this.thumbnails) this.initThumbnails()
    var thumb,
        config = this.thumbnailConfig();
    this.thumbnails = [];
    for(var i=0, l=this.pages.length; i<l; i++){
      thumb = this.createThumbnail(i, config);
      this.thumbnailsList.append( thumb );
      this.thumbnails.push( thumb )
    }
    if (this.rtl){
      var thumbs = this.thumbnailsList.children();
      thumbs.eq(0).addClass("wowbook-right").removeClass("wowbook-left")
      for(var i=1, l=thumbs.length; i<l; i+=2) thumbs.eq(i).insertAfter( thumbs.eq(i+1) );
    }

    var tc = this.thumbnailsContainer;
    if (!tc.width()) tc.width( config.width*2 );

    this.setStyle( this.opts.styles || this.opts.style );

  }, // createThumbnails

  thumbnailConfig : function(){
    var config = {},
        // IE7 makes a empty div have the height of line-height, hence the lineheight:0
          fakeThumb = $('<div class="wowbook-thumbnail" style="display:none;position:absolute;line-height:0px;font-size:0px;">').prependTo(this.thumbnailsContainer),
        // IE7 bug makes the height of the empty div=2. Since nobody wants a thumbnail
        // with 2 pixels height, when this happens we consider that it probably means height = 0
        thumbHeight = this.opts.thumbnailHeight || (fakeThumb.height()<=2 ? 0 : fakeThumb.height()),
        thumbWidth  = this.opts.thumbnailWidth  || fakeThumb.width(),
        scale = thumbWidth/this.pageWidth ||
                thumbHeight/this.pageHeight || this.opts.thumbnailScale;
    fakeThumb.remove();
    this.thumbnailScale = scale;
    config.width  = thumbWidth  || Math.floor( this.pageWidth*scale );
    config.height = thumbHeight || Math.floor( this.pageHeight*scale );
    config.cloneCSS = {
      display         : 'block',
      left            : 0,
      top             : 0,
      position        : 'relative',
      transformOrigin : "0 0"
    };
    if ($.wowBook.support.transform) {
      config.cloneCSS.transform = "scale("+scale+")"
    } else {
      config.cloneCSS.zoom = scale;
    }
    if (this.differentPageSizes) {
       var scaleInternalPage = this.opts.pageWidth ? scale*this.pageWidth/this.opts.pageWidth
                          : this.opts.pageHeight ? scale*this.pageHeight/this.opts.pageHeight
                          : this.opts.thumbnailScale;
      if ($.wowBook.support.transform) {
        config.scaleInternalPage = { transform: "scale("+scaleInternalPage+")" }
      } else {
        config.scaleInternalPage = { zoom: scaleInternalPage }
      }
    }
    return config
  }, // thumbnailConfig

  createThumbnail : function(pageIndex, config){
    var page = this.pages[pageIndex];
    if (!page) return
    if (!config) config=this.thumbnailConfig();

    var thumb = $('<li class="wowbook-thumbnail"><div class="wowbook-overlay">')
      .addClass( this.pageIsOnTheLeft(pageIndex) ? "wowbook-left" : "wowbook-right" )
      .css({ width : config.width, height : config.height });

    if (this.opts.thumbnailsSprite) {
      thumb.css('background', 'url("'+this.opts.thumbnailsSprite+'") no-repeat 0px -'
                              +pageIndex*config.height+"px")
    } else {
      var clonedPage = page.clone();
      if (clonedPage.hasClass("wowbook-page-holded")) {
        this.resetPage(clonedPage);
        clonedPage.find('.wowbook-fold-gradient-container').remove();
      }
      clonedPage.css(config.cloneCSS);
      if (config.scaleInternalPage && !page.isCover) clonedPage.css(config.scaleInternalPage);
      thumb.prepend(clonedPage)
    }

    // click
    var book=this;
    thumb.click(function(){ book.gotoPage(pageIndex); book.hideThumbnails(); })

    return thumb;
  }, // createThumbnail

  updateThumbnail : function(index, config){
    if (!this.thumbnails) return;
    var thumb = this.thumbnails[index]
    if (!thumb) return
    var newthumb = this.createThumbnail(index, config)
    if (!newthumb) return
    thumb.width( newthumb.width() )
    thumb.height( newthumb.height() )
    if (!this.opts.thumbnailsSprite) {
      if (!this.pdfDoc) {
        thumb.children(":not(.wowbook-overlay)").replaceWith( newthumb.children(":not(.wowbook-overlay)") )
      } else {
        this.pdfRenderThumbnail( index, thumb, config );
      }
    }
    thumb.width( newthumb.width() )
    thumb.height( newthumb.height() )
  }, // updateThumbnail

  updateThumbnails : function(){
    if (!this.thumbnails) { this.createThumbnails(); return }
    var config = this.thumbnailConfig();
    for(var i=0, l=this.pages.length; i<l; i++){
      this.updateThumbnail(i, config);
    }
    var tc = this.thumbnailsContainer;
    if (!tc.width()) tc.width( config.width*2 );
    this.thumbnailsContainer.toggleClass('wowbook-closable', this.closable);
  }, // updateThumbnails

  _moveThumbnailsList : function(offset, options){
    var currentPos = this.thumbnailsList.position()[this.opts.thumbnailsVertical ? "top" : "left"];
    this._setThumbnailsListPosition(currentPos+offset, options);
  }, // _moveThumbnailsList

  _setThumbnailsListPosition : function(position, options){
    var vertical  = this.opts.thumbnailsVertical,
        dimension = vertical ? "height" : "width",
        props     = {};

    var clipperSize = this.thumbnailsClipper[dimension](),
        minpos = -this.thumbnailsList[dimension]()+clipperSize;

    if (position < minpos ) position = minpos;
    if (position > 0) position = 0;
    this.thumbnailsBackButton.toggleClass("wowbook-disabled", position==0      || minpos>0);
    this.thumbnailsNextButton.toggleClass("wowbook-disabled", position==minpos || minpos>0);
    props[vertical ? "top" : "left"] = position;

    // return

    if (options==undefined) options = $.extend({}, this.opts.thumbnailsAnimOptions);
    var book=this;
    if ($.isNumeric(options)) options = { duration: options };
    options.step = vertical ? function(e){ book.thumbnailsClipper.scrollTop(e); }
                            : function(e){ book.thumbnailsClipper.scrollLeft(e); };
    options.complete = function(){
      if ( book.pdfDoc ) book.updateVisibleThumbnails();
    };
    this._tb = this.thumbnailsClipper[vertical ? "scrollTop" : "scrollLeft"]();
    $(this).stop();
    $(this).animate({ _tb: -position }, options);
  }, // _setThumbnailsListPosition

  updateVisibleThumbnails : function(){
    var vertical  = this.opts.thumbnailsVertical,
        prop      = vertical ? "top" : "left",
        dimension = vertical ? "height" : "width";

    if (!this._thumbnailsPos) {
      this._thumbnailsPos = [];
      for(var i=0;i<this.thumbnails.length;i++) {
        this._thumbnailsPos[i] = this.thumbnails[i].position()[prop];
      }
    }
    var thumbsPos  = this._thumbnailsPos;
    var minpos     = -this.thumbnailsList.position()[prop];
    var maxpos     = minpos+this.thumbnailsClipper[dimension]();
    var firstThumb, lastThumb;

    // search for the first thumbnail inside the visible range
    for(var i=0;i<this.thumbnails.length;i++) {
      if ( firstThumb==undefined && thumbsPos[i] > minpos ) { firstThumb = i }
      if ( lastThumb==undefined  && thumbsPos[i] > maxpos ) { lastThumb =  i }
    }
    if (!firstThumb) firstThumb = 0;
    if (!lastThumb) lastThumb = this.thumbnails.length-1;

    this.pdfCancelRenderThumbnail(0,firstThumb);
    this.pdfCancelRenderThumbnail(lastThumb, this.thumbnails.length);
    for(var i=firstThumb-2; i<=lastThumb; i++) {
      this.updateThumbnail( i );
    }
  }, // updateVisibleThumbnails

  showThumbnail : function(thumbIndex, duration){
    if (!this.thumbnails || !this.thumbnailsContainer.is(":visible")) return;
    if (thumbIndex==undefined) thumbIndex = this.currentPage;
    if (thumbIndex>0 && this.pageIsOnTheRight(thumbIndex)) thumbIndex--;

    var vertical  = this.opts.thumbnailsVertical,
        prop      = vertical ? "top" : "left",
        dimension = vertical ? "height" : "width";

    var thumb         = this.thumbnails[thumbIndex],
        clipper       = this.thumbnailsClipper,
        targetPos     = clipper[dimension]()/2-(thumb[dimension]()/(vertical ? 2 : 1) ),
        thumbPos      = thumb.offset()[prop]-clipper.offset()[prop];

    this._moveThumbnailsList(targetPos-thumbPos, duration);
  }, // showThumbnail

  showThumbnails : function(duration){
    if (!this.thumbnails || !this.thumbnails.length) this.createThumbnails()
    this.thumbnailsContainer.fadeIn(duration!=undefined ? duration : this.opts.thumbnailsAnimOptions)
    this.showThumbnail(undefined, 0);
  },

  hideThumbnails : function(duration){
    this.thumbnailsContainer.fadeOut(duration!=undefined ? duration : this.opts.thumbnailsAnimOptions)
  },

  toggleThumbnails : function(duration){
    $(this.thumbnailsContainer).is(':visible') ? this.hideThumbnails(duration) : this.showThumbnails(duration)
  },


  //
  // PDF
  //
  setPDF: function( url ){
    this.pdf = url;
    this.pdfRenderQueue = [];
    this.pdfPageRendering = false;

    this.opts.zoomUsingTransform = true;
    this.zoomContent.css("zoom", 1);
    if ( this.currentScale!=1 ) this.scale( this.currentScale );

    this.elem.addClass("wowbook-pdf");
    this.removePages();
    if (this.opts.pagesInMemory == null) this.opts.pagesInMemory = 6;
    var book=this;
    this.pdfCSS_UNITS = 96.0 / 72.0;

    if ( book.opts.pdfTextSelectable ) this.zoomContent.css('-webkit-user-select', 'text');

    PDFJS.getDocument( url ).then(function( pdfDoc ){
      book.pdfDoc = pdfDoc;
      book.currentPage = book.startPage;
      pdfDoc.getPage(1).then(function(page){


        for (var i=0; i < pdfDoc.numPages; i++) {
          book.insertPage("<div>", true);
        }

        if ( book.opts.pdfFind ) book.pdfFindSetup();
        book.pdfBuildLinkService();
        if ( book._pdfFindController ) book._pdfFindController.resolveFirstPage();

        if ( !book.opts.toc ) book.pdfOutline();

        book.updateBook();

        //Grab the viewport with original scale
        var viewport = page.getViewport( 1*book.pdfCSS_UNITS*book.opts.pdfScale );
        book.pdfHeight = viewport.height;
        book.pdfWidth  = viewport.width;
        book.pdfViewport = viewport;

        book._originalHeight = null;
        book._originalWidth = null;
        book.setDimensions( book.pdfWidth*2, book.pdfHeight );
      });
    }, book.opts.onPDFLoadError || function( error ){
      $(book.pages[0] || book.elem).html( error.message );
      if (console && console.log) console.log( error );
    });
  }, // setPDF

  pdfBuildLinkService: function(){
    var book=this;
    this.pdfLinkService = {
      navigateTo: function(){
        book.pdfNavigateTo.apply(book, arguments);
      },
      getDestinationHash: function( dest ){
        return this.getAnchorUrl('');
      },
      getAnchorUrl: function( anchor ) {
        return anchor;
      }
    };
    return this._pdfLinkService;
  }, // pdfBuildLinkService

  pdfResetPages: function(){
    this.updateBook();
    for(var i=0; i < this.pages.length; i++) {
      this.unloadPage( this.pages[i] );
    }
    this.showPage( this.currentPage );
    if (this.opts.scaleToFit) this.scaleToFit();
    this.positionBookShadow();
  }, // pdfResetPages

  pdfLoadPage: function( pageIndex, callback ){
    var canvas = $('<canvas>');
    if (this.opts.pdfProgressiveRender) {
      var page = this.pages[pageIndex];
      canvas.appendTo( page.find(".wowbook-page-content") );
    }
    this.pdfRenderPage( pageIndex, canvas[0], this.finishPageLoading );
  }, // pdfLoadPage

  /**
  * Get page info from document, resize canvas accordingly, and render page.
  * param pageIndex : book Page index. Remember, book is 0 based and pdf is 1 based
  *                    ou seja, pageIndex 1 no book é a pagina 2 do pdf.
  */


  pdfRenderPage: function( pageIndex, canvas, callback, scale, type ) {
    if (this.pdfPageRendering) {
      this.pdfQueueRenderPage( pageIndex, canvas, callback, scale, type );
      return;
    }
    this.pdfPageRendering = true;

    var book = this;
    var pdfIndex = pageIndex+1;
    this.pdfDoc.getPage( pdfIndex ).then(function(page){
      if (!scale) scale = book.pdfFindScaleToFit();
      var viewport = page.getViewport( scale*book.pdfCSS_UNITS*book.opts.pdfScale );

      var bookPage = book.pages[pageIndex];

      var addCanvasToPage = false;
      var canvasRendered  = false;
      if ( book.opts.pdfUpdateRender && type!="thumb" ) {
        var realScale = book.currentScale*book.zoomLevel*book.opts.pdfPixelRatio;
        var desiredWidth = bookPage.pageWidth*realScale;
        var unscaledViewport = page.getViewport(1);
        var scaledViewport = page.getViewport( desiredWidth / unscaledViewport.width );
        viewport = scaledViewport;
        if ( canvas ) {
          $(canvas).addClass("wowbook-pdf-zoom-"+realScale)
                   .css({ transform: "scale("+(1/realScale)+")", "transform-origin": "0 0 0" });
        } else {
          canvas = bookPage.find(".wowbook-pdf-zoom-"+realScale);
          canvasRendered = canvas.length;
          if ( !canvas.length ) {
            canvas = $("<canvas>").addClass("wowbook-pdf-zoom-"+realScale);
            canvas.css({ transform: "scale("+(1/realScale)+")", "transform-origin": "0 0 0" });
            addCanvasToPage = true;
          }
          canvas = canvas[0];
        }
      }

      if ( !canvasRendered ) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
      }

      var renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      };

      var pageRenderedCallback = function(){
        if ( addCanvasToPage && !$(canvas).parent().length ) {
          $(canvas).appendTo( bookPage.find(".wowbook-page-content") );
        }

        if ( callback ) callback.call( book, book.pages[pageIndex], canvas);
        if ( type!="thumb" ) {
          bookPage.find("canvas").not(canvas).remove();

          if ( !bookPage.find('.wowbook-pdf-annotations').length ) {
            var annotationsDiv = $('<div class="wowbook-pdf-annotations">').appendTo( bookPage.find('.wowbook-page-content') );
            book.pdfAnnotations( page, book.pdfViewport, annotationsDiv );
          }

          if ( book.opts.pdfTextSelectable && !bookPage.textLayer ) {
            book.pdfTextLayer( page, pageIndex, book.pdfViewport );
          }
        }
        book.pdfPageRendering = false;
        book.pdfDequeueRenderPage();
      } // pageRenderedCallback

      var pageFailRenderedCallback = function(){
      };

      if ( canvasRendered ) {
        pageRenderedCallback();
        return;
      }
      var renderTask = page.render(renderContext).then( pageRenderedCallback, pageFailRenderedCallback);
    });
  }, // pdfRenderPage

  pdfUpdateRender: function( callback ) {
    if ( !this.opts.pdfUpdateRender ) return;
    var page  = this.pages[ this.currentPage ];
    var other = this.otherPage( this.currentPage );
    if ( page ) this.pdfRenderPage( page.pageIndex, undefined, callback );
    if ( other!=undefined ) this.pdfRenderPage( other, undefined, callback );
  }, // pdfUpdateRender


  pdfAnnotations: function (pdfPage, viewport, annotationsDiv) {
    var book=this;
    pdfPage.getAnnotations().then(function( annotations ){
      viewport = viewport.clone({ dontFlip: true });
      var parameters = {
        viewport: viewport,
        div: annotationsDiv[0],
        annotations: annotations,
        page: pdfPage,
        linkService: book.pdfLinkService
      };
      PDFJS.AnnotationLayer.render( parameters );
      annotationsDiv.find("a").attr("target","_blank");
    });
  }, // pdfAnnotations

  pdfTextLayer: function (pdfPage, pageIndex, viewport, textLayerDiv) {
    if ( !textLayerDiv ) {
      var bookPage = this.pages[pageIndex];
      textLayerDiv = bookPage.find('.wowbook-pdf-text');
      if ( !textLayerDiv.length ) {
        textLayerDiv = $('<div class="wowbook-pdf-text">').appendTo( bookPage.find('.wowbook-page-content') );
      }
    }

    var textLayer = new PDFJS.TextLayerBuilder({
      textLayerDiv: textLayerDiv[0],
      pageIndex: pageIndex,
      viewport: viewport,
      findController: this._pdfFindController
    });
    bookPage.textLayer = textLayer;
    pdfPage.getTextContent({ normalizeWhitespace: true }).then(function(textContent) {
      textLayer.setTextContent( textContent );
      textLayer.render( PDFJS.TextLayerBuilder.TEXT_LAYER_RENDER_DELAY );
    });
  }, // pdfTextLayer

  pdfNavigateTo: function( dest ){
    var book = this;
    if (!book.pagesRefMap) book.pagesRefMap={};

    var goToDestination = function( destRef ) {
      // dest array looks like that: <page-ref> </XYZ|FitXXX> <args..>
      var pageNumber = destRef instanceof Object ?
                          book.pagesRefMap[destRef.num +' '+ destRef.gen +' R'] :
                          (destRef + 1);
      if ( pageNumber ) {
        book.gotoPage( pageNumber-1 );
      } else {
        book.pdfDoc.getPageIndex( destRef ).then(function( pageIndex ){
          var pageNum = pageIndex + 1;
          book.pagesRefMap[destRef.num +' '+ destRef.gen +' R'] = pageNum;
          goToDestination(destRef);
        });
      }
    };

    var destinationPromise = (typeof dest=='string') ? this.pdfDoc.getDestination(dest)
                                                     : Promise.resolve(dest);
    destinationPromise.then(function( destination ){
      if (!(destination instanceof Array)) {
        return; // invalid destination
      }
      goToDestination( destination[0] );
    });
  }, // pdfNavigateTo

  pdfRenderThumbnail: function( index, thumb, config ){
    this.thumbnailsContainer.addClass("wowbook-pdf");
    var page = this.pages[index];
    if (!page || page.loading) return;
    if (thumb.pdf || thumb.rendering) {
      return;
    }

    thumb.rendering = true;

    var canvas = thumb.find("canvas");
    if (!canvas.length) {
      canvas = $('<canvas>').appendTo( thumb.find(".wowbook-page-content") );
    }
    if (!this.opts.pdfProgressiveRender) {
      canvas.css("display", "none");
    }
    thumb.find(".wowbook-page").css({
      width: thumb.width(),
      height: thumb.height(),
      zoom: 1,
      transform: "scale(1)"
    })
    this.pdfRenderPage( index, canvas[0], function(page, canv){
      canvas.css("display", "block");
      thumb.rendering = false;
      thumb.pdf = true;
    }, this.thumbnailScale*this.opts.pdfScale, "thumb");
  }, // pdfRenderThumbnail

  // remove from the queue render all thumbnails that are in the range passed in the arguments
  pdfCancelRenderThumbnail: function( min, max ){
    var queue = this.pdfRenderQueue;
    var i=0;
    while( i < queue.length ){
      var thumb = queue[i][0];
      if ( (thumb>=min && thumb<=max) && queue[i][4]=="thumb") {
        this.thumbnails[thumb].rendering = false;
        queue.splice(i, 1);
      } else {
        i++;
      }
    }
  }, // pdfCancelRenderThumbnail

  // type is used to differentiate between thumbnails and regular pages
  pdfQueueRenderPage: function(number, canvas, callback, scale, type){
    this.pdfRenderQueue.push( [].slice.call(arguments) );
  }, // pdfQueueRenderPage

  pdfDequeueRenderPage: function(){
    var render = this.pdfRenderQueue.shift();
    if (render) this.pdfRenderPage.apply(this, render);
  }, // pdfDequeueRenderPage

  pdfFindScaleToFit: function(){
    var width  = this.pageWidth,
        height = this.pageHeight,
        ar     = this.pdfWidth/this.pdfHeight;
    if ( height*ar > width ) height = width/ar;
    return height/this.pdfHeight;
  }, // pdfFindScaleToFit

  pdfOutline: function(){
    var book=this;
    this.pdfDoc.getOutline().then( function(outline){
      if ( !outline ) return;

      function convertPdfOutlineToToc( outline ) {
        var toc = [];
        for (var i=0,l=outline.length;i<l;i++) {
          var tocItem = [];
          tocItem[0] = PDFJS.removeNullCharacters( outline[i].title );
          tocItem[1] = outline[i].url;
          if ( outline[i].items && outline[i].items.length ) {
            tocItem[2] = convertPdfOutlineToToc( outline[i].items );
          }
          tocItem[3] = outline[i].dest;
          toc.push( tocItem );
        }
        return toc;
      } // convertPdfOutlineToToc

      book.opts.toc = convertPdfOutlineToToc( outline );
    });
  }, // pdfOutline


  pdfFindSetup: function() {
    if ( this._pdfFindController ) return;


    this.opts.pdfTextSelectable = true;
    this.createFindBar();
    this.pdfCreateFindController();
  }, // pdfFindSetup

  pdfFind: function(){
    this.pdfSearch.apply( this, arguments );
  }, // pdfFind

  pdfFindNext: function(){
    var args = Array.prototype.slice.call(arguments);
    args[3] = false;
    args[4] = 'again';
    this.pdfSearch.apply( this, args );
  }, // pdfFindNext

  pdfFindPrevious: function(){
    var args = Array.prototype.slice.call(arguments);
    args[3] = true;
    args[4] = 'again';
    this.pdfSearch.apply( this, args );
  }, // pdfFindNext

  createFindControl : function( elem, opts ){
    if ( !opts ) opts = this.opts;
    var findControl = $(elem).addClass("wowbook-control-find");
    var book = this;
    findControl.on("click.wowbook", function( evt ){
      if ( $(evt.target).closest(".wowbook-findbar").length ) return;
      book.toggleFindBar(); return false
    });
  }, // createFindControl

  toggleFindBar : function( findBar ){
    if ( !findBar ) findBar = $(this._pdfFindBar);
    if ( findBar.hasClass("wowbook-hidden") ) {
      findBar.css("opacity", 0).removeClass("wowbook-hidden");
      if ( !isInViewPort( findBar ) ) findBar.toggleClass("wowbook-up");
      findBar.css("opacity", 1);
      findBar.find(".wowbook-find-text").focus();
    } else {
      findBar.addClass("wowbook-hidden");
    }
  }, // toggleFindBar

  createFindBar : function(){
    var f='<div id="findbar" class="wowbook-findbar wowbook-hidden">'
          +'<label style="display:none">Find: </label>'
          +'<div class="wowbook-find-text-container">'
          +'<input class="wowbook-find-text" placeholder="Text to find"><span class="wowbook-find-count"></span>'
          +'</div>'
          +'<a title="Find the previous occurrence of the phrase" class="wowbook-find-previous wowbook-control-back">'
            +'<i></i><span>Previous</span>'
          +'</a>'
          +'<a title="Find the next occurrence of the phrase" class="wowbook-find-next wowbook-control-next">'
            +'<i></i><span>Next</span>'
          +'</a>'
          +'<label style="display:none"><input type="checkbox" class="wowbook-find-highlight-all" checked="1"> Highlight all</label>'
          +'<label><input type="checkbox" class="wowbook-find-match-case"> Match case</label>'
          +'<a class="wowbook-close"><i></i></a>'
        +'</div>';

    // FIXME - deve ter default
    var findBar = $( f ).appendTo( $(this.toolbars[0]).find(".wowbook-controls") );
    this._pdfFindBar = findBar;
    this.setFindBarEventHandlers( findBar );
    this.pdfFindBarMethods( findBar );
    return findBar;
  }, // createFindBar

  setFindBarEventHandlers: function( findBar ){
    // findBar = $(findBar);
    var book=this;
    var findBarUpdated = function( evt ){
      var data = evt.data || {};
      var textToFind       = findBar.find(".wowbook-find-text").val();
      var findMatchCase    = findBar.find(".wowbook-find-match-case").prop("checked");
      var findHighlightAll = findBar.find(".wowbook-find-highlight-all").prop("checked");
      var again            = ( data.next || data.previous ) ? "again" : "";
      book.pdfSearch( textToFind, findHighlightAll, findMatchCase, data.previous, again );
    }
    findBar.find(".wowbook-find-text").on("input", findBarUpdated);
    findBar.find(".wowbook-find-match-case, .wowbook-find-highlight-all").on("click", findBarUpdated);
    findBar.find(".wowbook-find-previous").on("click", { previous:true },findBarUpdated);
    findBar.find(".wowbook-find-next").on("click", { next:true }, findBarUpdated);
    findBar.find(".wowbook-close").on("click", function(){ book.toggleFindBar( findBar ); });
    findBar.find(".wowbook-find-count").on("click", function(){ findBar.find(".wowbook-find-text").focus() });
  }, // setFindBarEventHandlers


  //
  // Container
  //
  createContainer: function( selector ){
    this.container = $("<div class='wowbook-container'>");
    var container = this.container,
        opts = this.opts,
        defaults = $.wowBook.defaults;

    container.prependTo( this.elem.parent() );
    this.containerBook = $("<div class='wowbook-book-container'>").appendTo( container ).append( this.elem );
    this.containerToolbar = $("<div class='wowbook-toolbar-container'>").appendTo( container );

    if ( opts.containerWidth ) container.css( 'width', opts.containerWidth );
    if ( opts.containerHeight ) container.css( 'height', opts.containerHeight );
    if ( opts.containerBackground ) container.css( 'background', opts.containerBackground );
    if ( opts.containerPadding ) this.containerBook.css( 'padding', opts.containerPadding );

    if ( opts.thumbnailsParent==defaults.thumbnailsParent ) opts.thumbnailsParent=container;
    if ( opts.tocParent==defaults.tocParent ) opts.tocParent=container;
    if ( opts.fullscreenElement==defaults.fullscreenElement ) opts.fullscreenElement=container;
    if ( !opts.scaleToFit ) {
      opts.scaleToFit = this.containerBook;
    }
    if ( opts.container=="window" || opts.container==window ) {
      container.addClass("wowbook-container-full");
    }

    if ( opts.toolbar ) {
      if ( opts.toolbarParent==defaults.toolbarParent ) opts.toolbarParent=this.containerToolbar;
      if (this._isMobile) {
        opts.toolbarPosition = "bottom";
      }
    }
    if (this._isMobile) container.addClass('wowbook-mobile');


  }, // createContainer

  destroyContainer : function(){
    if ( !this.container ) return;
    this.container.replaceWith( this.elem );
    this.container=undefined;
  }, // destroyContainer

  updateContainer : function(){
    var opts = this.opts,
        toolbarHeight = 0;

    if ( this.opts.responsiveToolbar ) this.updateResponsiveToolbar();

    if ( opts.toolbarParent == this.containerToolbar ) {
      var toolbarOnTop = opts.toolbarPosition=="top";
      if ( toolbarOnTop && !this.containerToolbar.is(".wowbook-top") ) {
        this.containerToolbar.insertBefore( this.containerBook );
      }
      if ( !toolbarOnTop && this.containerToolbar.is(".wowbook-top") ) {
        this.containerToolbar.insertAfter( this.containerBook );
      }
      this.containerToolbar.toggleClass("wowbook-top", toolbarOnTop);
      var toolbarHeight = $(this.toolbars[0]).outerHeight(true);
    }

    var containerBookHeight = this.container.height()-toolbarHeight;

    this.containerBook.outerHeight( containerBookHeight );
    if (!opts.conteinerHeight) {
      this.elem.css( "top", this.elem.css( "top") );
      var book=this;
      setTimeout( function(){ book.elem.css( "top", "" ) },0);
    }

    if ( !$.wowBook.support.transform ) this.elem.css("top", "auto");

    if ( this.mobileToolbar ) this.updateMobileToolbar();

  },  // updateContainer

  //
  // Lightbox
  //
  lightbox: function( selector ){
    this._lightboxElem = $("<div class='wowbook-lightbox'>").appendTo("body").addClass( this.opts.lightboxClass );
    this._lightboxBookContainer = $("<div class='wowbook-book-container'>").appendTo( this._lightboxElem );
    this._lightboxOverlay = this.opts.lightboxOverlay ? $("<div class='wowbook-lightbox-overlay'>").appendTo("body") : $();
    this.opts.thumbnailsParent  = this._lightboxElem;
    this.opts.tocParent         = this._lightboxElem;
    this.opts.fullscreenElement = this._lightboxElem;
    if (this.opts.lightboxResponsive) {
      this.opts.scaleToFit = this._lightboxBookContainer;
      this.responsive();
    }
    if (this._isMobile) this._lightboxElem.addClass('wowbook-mobile');

    if (this.opts.lightboxBackground) this._lightboxElem.css("background", this.opts.lightboxBackground);
    if (this.opts.lightboxColor) this._lightboxElem.css("backgroundColor", this.opts.lightboxColor);
    if (this.opts.lightboxOverlayColor) this._lightboxOverlay.css("backgroundColor", this.opts.lightboxOverlayColor);

    this._lightboxElem.css({
      width: this.opts.lightboxWidth,
      height: this.opts.lightboxHeight
    });

    this.elem.appendTo( this._lightboxBookContainer );

    if (this.opts.toolbar) {
      this.opts.toolbarParent = this._lightboxElem;
      if (this._isMobile) {
        this.opts.toolbarPosition = "bottom";
      }
    }

    var book=this;
    $(selector).on("click.wowbook", function(){
      book.showLightbox();
    });
    $("<button class='wowbook-close'>✕</button>").appendTo(this._lightboxElem).on("click.wowbook", function(){
      book.hideLightbox();
    });
    $(document).on("keydown.wowbook.lightbox", function(e){
      if (!book.lightboxOn) return
      // ignore when typing in a input element
      if ($(e.target).filter('input, textarea, select').length) return;
      if (e.which===27) book.hideLightbox();
    });
  }, // lightbox

  destroyLightbox: function( selector ){
    if ( this.lightboxOn ) this.hideLightbox();
    $(this._lightboxElem).remove();
    $(this._lightboxOverlay).remove();
  }, // destroyLightbox

  showLightbox: function(){
    if (this.thumbnailsContainer && this.thumbnailsContainer.parent()[0] != this._lightboxElem) {
      this.thumbnailsContainer.appendTo(this._lightboxElem);
    }
    if ( this.elem.parent()[0] != this._lightboxBookContainer ){
      this.elem.appendTo(this._lightboxBookContainer);
    }
    if (this.tocContainer && this.tocContainer.parent()[0] != this._lightboxElem) {
      this.tocContainer.appendTo(this._lightboxElem);
    }

    this.lightboxOn = true;
    $("body").addClass("wowbook-lightbox-on");
    this._lightboxElem.fadeIn();
    this.centerLightbox();
    this._lightboxOverlay.fadeIn();
    this.positionBookShadow();

    if ( this.opts.responsiveToolbar ) this.updateResponsiveToolbar();

    if (this.opts.toolbarParent == this._lightboxElem) {
      var height = $(this.toolbars[0]).outerHeight(true);
      var prop = this.opts.toolbarPosition=="top" ? "top" : "bottom";
      this._lightboxBookContainer.css( prop, height );
      $(this.toolbars[0]).css(prop, 0);
    }

    if (this.opts.lightboxResponsive) this.responsiveUpdater();
    if (this.mobileToolbar) this.updateMobileToolbar();
    if (this.opts.onShowLightbox) this.opts.onShowLightbox.call(this, this.pages[this.currentPage], this.currentPage);
  }, // showLightbox

  hideLightbox: function(){
    this.lightboxOn = false;
    this._lightboxElem.fadeOut();
    this._lightboxOverlay.fadeOut();
    $("body").removeClass("wowbook-lightbox-on");
    if ( fullscreenElement() ) this.exitFullscreen();
    if (this.opts.onHideLightbox) this.opts.onHideLightbox.call(this, this.pages[this.currentPage], this.currentPage);
  }, // hideLightbox

  centerLightbox: function(){
    var width  = $(window).width();
    var height = $(window).height();
    this._lightboxElem.css("left", (width-this._lightboxElem.outerWidth())/2 );
    this._lightboxElem.css("top", (height-this._lightboxElem.outerHeight())/2 );
  }, // centerLightbox


  //
  // Styles
  //
  setStyle: function( stylesOrClass ){
    if ( typeof stylesOrClass=="string" ) this._customCSSClass = stylesOrClass;
    if ( $.isPlainObject(stylesOrClass) ) {
      if ( !this._customCSSClass ) this._customCSSClass = this.generateCSSClassName();
      var styleTag = this.generateCSSClass( stylesOrClass, this._customCSSClass );
      $("body").append("<style>"+styleTag+"</style>");
    }

    var cssClass = this._customCSSClass;
    $(this.toolbars).addClass( cssClass )
      .find(".wowbook-controls").addClass( cssClass )
      .find(".wowbook-share-buttons").addClass( cssClass );
    $(this.tocContainer).addClass( cssClass );
    $(this.thumbnailsContainer).addClass( cssClass );
    $(this.thumbnailsContainer).find(".wowbook-control").addClass( cssClass );
    $(this.elem).find(".wowbook-page-number").addClass( cssClass );
    $(this._lightboxElem).find(".wowbook-close").addClass( cssClass );
    $(this._navControls).addClass( cssClass );
  }, // setStyle

  generateCSSClassName: function( ){
    $.wowBook.utils._cssClassCounter = ($.wowBook.utils._cssClassCounter || 0) + 1;
    return "wowbook-cs-"+$.wowBook.utils._cssClassCounter;
  }, // generateCSSClassName

  generateCSSClass: function( styles, className ){
    if ( !styles || !className ) return "";
    styles = $.extend( {}, styles );
    var css = [];

    function generateCSSRule( rule, styles ){
      var buf = [];
      buf.push( rule+" {" );
      for( var prop in styles ) { buf.push( "\t"+prop+" : "+styles[prop]+" !important;" ); }
      buf.push( "}" );
      buf = buf.join("\n");
      css.push( buf );
      return buf;
    } // generateCSSRule

    function sub( styles, prop, className ){
      if ( !styles[prop] ) return;
      generateCSSRule( className, styles[prop] );
      delete styles[prop];
    }

    if ( styles.hover ) generateCSSRule( "."+className+" .wowbook-close:hover", {color: styles.hover.color} );
    sub( styles, "hover", "."+className+" a:hover"+", ."+className+".wowbook-control:hover" );
    sub( styles, "active", "."+className+" a:active"+", ."+className+".wowbook-control:active" );
    sub( styles, "disabled", "."+className+" a.wowbook-disabled"+", ."+className+".wowbook-control.wowbook-disabled" );
    if ( styles.separator ) {
      styles.separator = styles.separator.split(",");
      generateCSSRule( "."+className+" a", {
        "border-color": styles.separator[0],
        "box-shadow": "0 1px 0 "+(styles.separator[1] || "transparent")+" inset"
      });
      delete styles.separator;
    }

    generateCSSRule( "."+className+".wowbook-page-number", {
      background: "transparent"
    });
    if ( styles.pageNumber ) {
      generateCSSRule( "."+className+".wowbook-page-number", {
        color: styles.pageNumber
      });
      delete styles.pageNumber;
    }

    generateCSSRule( "."+className, styles );

    return css.join("\n");
  }, // generateCSSClass


  //
  // Controls
  //
  controllify : function(controls){
    var book=this;

    $(controls.zoomIn || controls.zoomin).on("click.wowbook", function(){ book.zoomIn({});  return false });
    $(controls.zoomOut || controls.zoomout).on("click.wowbook", function(){ book.zoomOut({}); return false });
    $(controls.zoomReset || controls.zoomreset).on("click.wowbook", function(){ book.zoomReset({}); return false });
    $(controls.next     ).on("click.wowbook", function(){ book.advance(); return false });
    $(controls.back     ).on("click.wowbook", function(){ book.back();    return false });
    $(controls.first    ).on("click.wowbook", function(){ book.gotoPage(0); return false });
    $(controls.last     ).on("click.wowbook", function(){ book.gotoPage(book.pages.length-1); return false });
    $(controls.left     ).on("click.wowbook", function(){ book.gotoLeft();  return false });
    $(controls.right    ).on("click.wowbook", function(){ book.gotoRight();  return false });
    $(controls.lastLeft || controls.lastleft).on("click.wowbook", function(){ book.gotoLastLeft();  return false });
    $(controls.lastRight || controls.lastright).on("click.wowbook", function(){ book.gotoLastRight(); return false });
    $(controls.slideShow || controls.slideshow).on("click.wowbook", function(){ book.toggleSlideShow(); return false });
    $(controls.flipSound || controls.flipsound).on("click.wowbook", function(){ book.toggleFlipSound(); return false });
    $(controls.thumbnails).on("click.wowbook", function(){ book.toggleThumbnails(); return false });
    $(controls.fullscreen).on("click.wowbook", function(){ book.toggleFullscreen(); return false });
    $(controls.toc).on("click.wowbook", function(){ book.toggleToc(); return false });

    if ( $(controls.find).length ) this.createFindControl( $(controls.find) );

    if ( $(controls.fullscreen).length && !_requestFullscreen ) $(controls.fullscreen).hide();

    var url = this.opts.downloadURL || this.opts.downloadurl || this.opts.downloadUrl || this.opts.pdf;
    if ( url ) $(controls.download).attr("href", url).attr("download", url);

    if ( $(controls.share).length ) this.createShareControl( $(controls.share) );

    var controlList = ("zoomIn zoomOut zoomReset left lastLeft right lastRight next back first last slideShow flipSound "
                      +"thumbnails fullscreen toc currentPage pageCount").split(" "),
        controlName;
    for(var i=0,l=controlList.length;i<l;i++) {
      controlName = controlList[i].toLowerCase();
      this._controls[controlName] = $(this._controls[controlName]).add( controls[controlList[i]] || controls[controlName] );
    }
  }, // controllify

  toggleControl : function(control, state){
    control = this._controls[ control.toLowerCase() ];
    if (control) $(control).toggleClass('wowbook-disabled', state);
  }, // toggleControl


  //
  // Navigation controls (side)
  //
  createNavigationControls: function( parent ){
    if ( this._isMobile && this.opts.responsiveNavControls ) return;
    if ( !parent ) parent = this.opts.navControls;
    if ( parent==="parent" ) parent = this.elem.parent();
    if ( parent===true ) parent = this.containerBook || this._lightboxBookContainer;
    if ( !parent ) return;
    if ( typeof(parent)=="string" ) parent = $(parent);
    var left  = $("<button class='wowbook-nav wowbook-nav-left wowbook-disabled'><i></i></button>").appendTo(parent);
    var right = $("<button class='wowbook-nav wowbook-nav-right wowbook-disabled'><i></i></button>").appendTo(parent);
    this.controllify({ left: left, right: right });
    this._navControls = $(left).add(right);
    if (this.opts.toolbarIcons) this._navControls.addClass("wowbook-"+this.opts.toolbarIcons);
  }, // createNavigationControls


  //
  // Share social control
  //
  shareControlButtons : {
    twitter      : ['<a href="http://twitter.com/share" target="_blank"><i class="fa-twitter"></i></a>', { text: "text", via: "via", url: "url"} ]
    ,googleplus  : ['<a href="https://plus.google.com/share" target="_blank" ><i class="fa-google-plus"></i></a>', { url: "url" }]
    ,facebook    : ['<a href="http://www.facebook.com/sharer/sharer.php" target="_blank" ><i class="fa-facebook"></i></a>',  {u: "url"}]
    ,stumbleupon : ['<a href="http://www.stumbleupon.com/submit" target="_blank"><i class="fa fa-stumbleupon"></i></a>', {url: "url", title:"title"}]
    ,reddit      : ['<a href="http://reddit.com/submit" target="_blank"><i class="fa fa-reddit"></i></a>', {url: "url", title:"title"}]
    ,linkedin    : ['<a href="http://www.linkedin.com/shareArticle" target="_blank"><i class="fa fa-linkedin"></i></a>',{url: "url", title: "title", summary:"summary",source:"source_url"}]
  },

  createShareControl : function( elem, opts ){
    if ( !opts ) opts = this.opts;

    var buttons = $.extend({}, this.shareControlButtons, opts.shareButtons),
        button,
        visibleButtons = opts.share.split(/\s*,\s*|\s+/), // separated by comma or space
        shareButtons = $("<div class='wowbook-share-buttons wowbook-hidden'>");
    for(var i=0,l=visibleButtons.length;i<l;i++){
      button = buttons[ visibleButtons[i] ];
      if ( !button ) continue;
      $( button[0] ).appendTo( shareButtons )
        .addClass("wowbook-control wowbook-share-button")
        .data("params", button[1]);
    }

    var shareControl = $(elem).addClass("wowbook-control-share").append( shareButtons );
    var book = this;
    shareControl.on("click", function( evt ){ book.toggleShareButtons( evt.target ); });
    shareControl.on("click", ".wowbook-share-button", function(){
      var callback = book.opts.shareButtonCallback;
      if ( $.isFunction(callback) && callback(book, this)===false ) return;

      var params = $.extend({}, $(this).data("params")),
          shareParams = $.extend($.wowBook.defaults.shareParams, book.opts.shareParams);
      if ( shareParams.url=="_current_" ) shareParams.url=window.location.href;

      var valueName;
      for( paramName in params ){
        valueName = params[ paramName ];
        if ( shareParams[ valueName ]!=undefined ) {
          params[paramName] = shareParams[valueName];
        } else {
          delete params[paramName];
        }
      }

      // lazy way to add the query to link href  ( this = anchor tag )
      this.search = $.param( params );
      window.open( this.href, '_blank');
      book.toggleShareButtons( this );
      return false;
    });
  }, // createShareControl

  toggleShareButtons : function( elem ){
    elem = $(elem).closest(".wowbook-control-share");
    var buttons = elem.find(".wowbook-share-buttons");
    if ( buttons.hasClass("wowbook-hidden") ) {
      buttons.css("opacity", 0).removeClass("wowbook-hidden");
      if ( !isInViewPort( buttons ) ) buttons.toggleClass("wowbook-up");
      buttons.css("opacity", 1);
    } else {
      buttons.addClass("wowbook-hidden");
    }
  }, // toggleShareButtons

  //
  // Toolbar
  //


  toolbarControls : {
    _default   : "<a href='#'><i></i></a>",
    lastLeft   : "<a><i></i></a>",// fa-chevron-left
    left       : "<a><i></i></a>", // fa-chevron-left
    right      : "<a><i></i></a>", // fa-chevron-right
    lastRight  : "<a><i></i></a>", // fa-chevron-right
    first      : "<a title='go to first page'><i></i></a>",// fa-chevron-left
    back       : "<a title='go back one page'><i></i></a>", // fa-chevron-left
    next       : "<a title='go foward one page'><i></i></a>", // fa-chevron-right
    last       : "<a title='go to last page'><i></i></a>", // fa-chevron-right
    zoomin     : "<a title='zoom in'><i></i></a>", // .fa-search-plus
    zoomout    : "<a title='zoom out'><i></i></a>", // .fa-search-minus
    slideshow  : "<a title='start slideshow'><i></i></a>", // .fa-play-circle-o, .fa-pause
    flipsound  : "<a title='flip sound on/off'><i></i></a>", // .fa-volume-up, .fa-volume-off
    fullscreen : "<a title='fullscreen on/off'><i></i></a>", // .fa-expand, .fa-compress
    thumbnails : "<a title='thumbnails on/off'><i></i></a>", // .fa-th
    toc        : "<a title='table of contents on/off'><i></i></a>", // .fa-list-ul
    download   : "<a title='download'><i></i></a>", // .fa-download
    find       : "<a title='find'><i></i></a>", // .fa-download
    share      : "<a title='share'><i></i></a>" // .fa-share
  },

  // controls - string or object
  // parent - jQuery selector or jQueryObject
  createToolbar : function(controls, parent){
    if (!controls) return;

    var parent = $(parent || this.opts.toolbarParent || this.elem.parent());
    if (!parent || !parent.length) return;

    var toolbar = $('<div class="wowbook-toolbar">'),
        toolbarControls = $('<div class="wowbook-controls">').appendTo(toolbar);
    if (this.opts.toolbarIcons) toolbar.addClass("wowbook-"+this.opts.toolbarIcons);

    controls = controls.split(/\s*,\s*/);
    var controlsObj = {};
    var control;
    for(var i=0; i < controls.length; i+=1) {
      control = this.createToolbarControl( controls[i] );
      controlsObj[ controls[i] ] = control;
      toolbarControls.append( control );
    }

    if ( this.opts.removeStickyHoverStyle ) {
      toolbar.on("touchstart", ".wowbook-control", function(){
        $(this).removeClass("remove-sticky-hover-style")
      })
      toolbar.on("touchend", ".wowbook-control", function(){
        $(".remove-sticky-hover-style").removeClass("remove-sticky-hover-style")
        $(this).addClass("remove-sticky-hover-style")
      })
    }

    parent.prepend(toolbar);
    this.controllify( controlsObj );

    this.toolbars.push( toolbar[0] );

    this.setStyle( this.opts.styles || this.opts.style );
    return toolbar;
  }, // createToolbar

  destroyToolbars : function(){
    this.toolbars && $(this.toolbars).remove();
    this.toolbars = null;
  }, // destroyToolbars

  // control  - name(string) or definition(object)
  createToolbarControl : function( control ){
    if (!this._avoidLoopControl) this._avoidLoopControl={};

    var controlName = control;
    var control;
    if ( $.isPlainObject( control ) ){
      var props = control;
      control = $(this.toolbarControls._default);
      for ( prop in props ) {
        // Properties of context are called as methods if possible
        if ( jQuery.isFunction( control[ prop ] ) ) {
          control[ prop ]( props[ prop ] );
        // ...and otherwise set as attributes
        } else {
          control.attr( prop, props[ prop ] );
        }
      }
    }
    if (typeof(control)=="string") {
      if (control.charAt(0)=="<") { control = $(control); }
      else {
        control = this.toolbarControls[control] || this.toolbarControls[control.toLowerCase()] || this.toolbarControls._default;
        if ( this._avoidLoopControl[controlName] ) return "Error CreateToolbarControl in loop";
        this._avoidLoopControl[controlName] = 1;
        control = this.createToolbarControl( control );
        this._avoidLoopControl[controlName] = 0;
        control = $(control).addClass("wowbook-control-"+controlName);
      }
    }

    control.addClass("wowbook-control");
    return control;
  }, // createToolbarControl


  setupMobileToolbar : function(){
    this.opts.toolbarPosition = "bottom";
    this.mobileToolbar = $(this.toolbars[0]);
    this.mobileToolbar.find(".wowbook-controls").css({
      position: "absolute",
      left: 0
    });
    this.createMobileToolbarToggle();
    this.slideDownMobileToolbar( 0 );
    this.updateMobileToolbar();
  }, // setupMobileToolbar

  toolbarIsExpandable : function( toolbar ){
    return toolbar.height()*1.1 < toolbar.find(".wowbook-controls").height();
  }, // toolbarIsExpandable

  updateMobileToolbar : function(){
    this.mobileToolbarToggle.toggleClass( "wowbook-collapsed", !this._mobileToolbarExpanded );
    this.mobileToolbarToggle.toggle( this.toolbarIsExpandable( this.mobileToolbar ) );
  }, // updateMobileToolbar

  createMobileToolbarToggle : function(){
    this.mobileToolbarToggle = $("<a class='wowbook-control wowbook-control-toggle-toolbar'><i></i></a>")
      .prependTo( this.mobileToolbar.find(".wowbook-controls") );
    var book = this;
    this.mobileToolbarToggle.on("click", function(){
      book.toogleMobileToolbar();
    });
    $(window).on("resize.wowbook", function(){
      if ( book.mobileToolbarToggle && book.mobileToolbar ) book.updateMobileToolbar();
    })
  }, // createMobileToolbarToggle

  slideUpMobileToolbar: function( duration ){
    var mobileControls = this.mobileToolbar.find(".wowbook-controls");
    var d = this.mobileToolbar.children().height()-this.mobileToolbar.height();
    mobileControls.css({ bottom: -d }).animate({ "bottom": 0 }, duration );
    this._mobileToolbarExpanded = true;
    this.updateMobileToolbar();
  }, // showMobileToolbar

  slideDownMobileToolbar: function( duration ){
    var mobileControls = this.mobileToolbar.find(".wowbook-controls");
    var d = this.mobileToolbar.children().height()-this.mobileToolbar.height();
    mobileControls.animate({ "bottom": -d },{
      duration: duration,
      complete: function(){ $(this).css( "bottom", "" );  }
    });
    this._mobileToolbarExpanded = false;
    this.updateMobileToolbar();
  }, // hideMobileToolbar

  toogleMobileToolbar: function(){
    if ( this._mobileToolbarExpanded ) { this.slideDownMobileToolbar() } else { this.slideUpMobileToolbar(); }
  }, // toogleMobileToolbar


  setupResponsiveToolbar : function(){
    this.responsiveToolbar = $(this.toolbars[0]);
    this.createResponsiveToolbarToggle();
    this.updateResponsiveToolbar();
  }, // setupResponsiveToolbar

  makeToolbarExpandable : function( expandable ){
    if ( this._responsiveToolbarExpandable ) return;
    this._responsiveToolbarExpandable = true;

    if (!this._originalToolbarPosition) this._originalToolbarPosition = this.opts.toolbarPosition;
    this.opts.toolbarPosition = "bottom";
    this.responsiveToolbar.find(".wowbook-controls").css({
      position: "absolute",
      left: 0
    });
    if ( this.container && this.container.css("overflow")!="hidden" ) {
      this.container.data("originalOverflow", this.container.css("overflow") );
      this.container.css( "overflow", "hidden" );
    }
    this.slideDownResponsiveToolbar( 0 );
  }, // makeToolbarExpandable

  unmakeToolbarExpandable : function(){
    if ( !this._responsiveToolbarExpandable ) return;
    this._responsiveToolbarExpandable = false;

    if (this._originalToolbarPosition) this.opts.toolbarPosition = this._originalToolbarPosition;
    this.responsiveToolbar.find(".wowbook-controls").css({
      bottom: "",
      position: "",
      left: ""
    });
    if ( this.container && this.container.data("originalOverflow") ) {
      this.container.css( "overflow", this.container.data("originalOverflow") );
      this.container.data("originalOverflow", "" );
    }
  }, // unmakeToolbarExpandable

  updateResponsiveToolbar : function(){
    if ( !this.responsiveToolbar ) return;

    this.responsiveToolbar.toggleClass("wowbook-small", this.responsiveToolbar.width()<480 );

    var toolbarIsExpandable = this.toolbarIsExpandable( this.responsiveToolbar );
    if ( toolbarIsExpandable ) {
      this.makeToolbarExpandable();
    } else {
      this.unmakeToolbarExpandable();
    }
    this.responsiveToolbar.toggleClass( "wowbook-collapsable", toolbarIsExpandable );
    this.responsiveToolbarToggle.toggleClass( "wowbook-collapsed", !this._responsiveToolbarExpanded );
    this.responsiveToolbarToggle.toggle( toolbarIsExpandable );
  }, // updateResponsiveToolbar

  createResponsiveToolbarToggle : function(){
    this.responsiveToolbarToggle = $("<a class='wowbook-control wowbook-control-toggle-toolbar'><i></i></a>")
      .prependTo( this.responsiveToolbar.find(".wowbook-controls") );
    var book = this;
    this.responsiveToolbarToggle.on("click", function(){
      book.toogleResponsiveToolbar();
    });
    $(window).on("resize.wowbook", function(){
      if ( book.responsiveToolbarToggle && book.responsiveToolbar ) book.updateResponsiveToolbar();
    })
  }, // createResponsiveToolbarToggle

  slideUpResponsiveToolbar: function( duration ){
    var mobileControls = this.responsiveToolbar.find(".wowbook-controls");
    var d = this.responsiveToolbar.children().height()-this.responsiveToolbar.height();
    mobileControls.css({ bottom: -d }).animate({ "bottom": 0 }, duration );
    this._responsiveToolbarExpanded = true;
    this.updateResponsiveToolbar();
  }, // showResponsiveToolbar

  slideDownResponsiveToolbar: function( duration ){
    var mobileControls = this.responsiveToolbar.find(".wowbook-controls");
    var d = this.responsiveToolbar.children().height()-this.responsiveToolbar.height();
    mobileControls.animate({ "bottom": -d },{
      duration: duration,
      complete: function(){ $(this).css( "bottom", "" );  }
    });
    this._responsiveToolbarExpanded = false;
    this.updateResponsiveToolbar();
  }, // hideResponsiveToolbar

  toogleResponsiveToolbar: function(){
    if ( this._responsiveToolbarExpanded ) { this.slideDownResponsiveToolbar() } else { this.slideUpResponsiveToolbar(); }
  }, // toogleResponsiveToolbar


  translate: function( elem, x, y, useTransform ){
    if ( $.wowBook.support.transform && useTransform!==false ) {
      var t = $.wowBook.useTranslate3d ? "translate3d("+(x || 0)+"px, "+(y || 0)+"px, 0px)"
                                       : "translate("+(x || 0)+"px, "+(y || 0)+"px) "
      elem.css("transform", t);
    } else {
      if (x!==undefined) elem.css({ left: x });
      if (y!==undefined) elem.css({ top: y });
    }
  } // translate


} // Book methods

//
// Defaults
//
$.wowBook.defaults = {
  width                 : 500,
  height                : 300,
  pageWidth             : undefined,
  pageHeight            : undefined,
  coverWidth            : undefined,
  coverHeight           : undefined,
  startPage             : 0,
  hardcovers            : false,
  hardPages             : false,
  closable              : true,
  centeredWhenClosed    : false,
  doublePages           : '.double',

  container             : false,
  containerWidth        : undefined,
  containerHeight       : undefined,
  containerPadding      : undefined,
  containerBackground   : undefined,
  toolbarContainerPosition : "", // depracated, use toolbarPosition instead
  rtl                   : false,

  responsive            : false,
  scaleToFit            : "",
  maxWidth              : undefined,
  maxHeight             : undefined,
  onResize              : null, // callback
  responsiveHandleWidth : undefined,

  singlePage            : false,
  responsiveSinglePage  : true,

  fullscreenElement     : document.documentElement,
  onFullscreenError     : null,
  onFullscreenErrorMessage : 'Cannot enter fullscreen mode.',

  use3d                 : true,
  perspective           : 2000,
  useTranslate3d        : 'mobile',
  useScale3d            : true,
  pageThickness         : 0,
  pageEdgeColor         : null,
  hardPageShadow        : true,

  style                 : null,
  bookShadow            : true,
  gutterShadow          : true,
  shadowThreshold       : 20,
  shadows               : true,
  foldGradient          : true,
  foldGradientThreshold : 20,

  pageNumbers           : true,
  firstPageNumber       : 1,
  numberedPages         : false,

  deepLinking           : true,
  updateBrowserURL      : true,
  moveToViewPort        : false,

  curl                  : true,
  curlSize              : 40,

  slideShow             : false,
  slideShowDelay        : 1000,
  slideShowLoop         : false,
  pauseOnHover          : true,

  touchEnabled          : true,
  swipeDuration         : 200,
  mouseWheel            : false,
  handleWidth           : false,
  handleClickDuration   : 300,
  turnPageDuration      : 1000,
  turnPageDurationMin   : 300,
  forceBasicPage        : false,
  sections              : '.wowbook-section',

  images                : undefined,
  srcs                  : undefined,
  loadingIndicator      : true,

  pdf                   : null,
  pdfScale              : 1,
  pdfProgressiveRender  : false,
  pdfTextSelectable     : false,
  pdfFind               : false,
  pdfUpdateRender       : true,
  onPDFLoadError        : null,
  pdfPixelRatio         : Math.min( window.devicePixelRatio || 1, 2),

  zoomLevel             : 1,
  zoomMax               : 2,
  zoomMin               : 1,
  zoomBoundingBox       : window,
  zoomStep              : 0.25,
  zoomDuration          : 200,
  zoomEasing            : "linear",
  onZoom                : null,
  pinchToZoom           : true,
  doubleClickToZoom     : false,

  allowDragBrowserPageZoom : false,

  flipSound             : true,
  flipSoundFile         : ['page-flip.mp3', 'page-flip.ogg'],
  flipSoundPath         : './wow_book/sound/',
  onPlayFlipSound       : null,

  keyboardNavigation    : {
                            back: 37,
                            advance: 39
                          },
  clipBoundaries        : true,
  onShowPage            : null,
  onHoldPage          : null,
  onReleasePage         : null,

  pagesInMemory         : null,
  pagesToKeep           : null,
  onLoadPage            : null,
  onUnloadPage          : null,

  lightbox              : null,
  lightboxColor         : null, // CSS:white
  lightboxOverlay       : false,
  lightboxOverlayColor  : null, // CSS:rgba(1,1,1,0.5)
  lightboxWidth         : "100%",
  lightboxHeight        : "100%",
  lightboxResponsive    : true,
  onShowLightbox        : undefined,
  onHideLightbox        : undefined,

  toc                   : undefined,
  tocParent             : "body",
  tocHeader             : "Table of contents",
  tocItemTemplate       : undefined,
  toolbarLightboxPosition: "",

  controls              : {},
  navControls           : false,
  responsiveNavControls : true,
  downloadURL           : null,
  // toolbar               : "lastleft, left, right, lastright, first, back, next, last, zoomin, zoomout, slideshow, flipsound, fullscreen, thumbnails",
  toolbar               : false,
  toolbarParent         : "body",
  toolbarIcons          : "fontawesome", // or icomoon
  responsiveToolbar     : true,
  toolbarPosition       : "bottom",

  removeStickyHoverStyle : true, // remove "stick" hover style on webkit touch devices
  share                 : "twitter, googleplus, facebook, stumbleupon, reddit, linkedin",
  shareParams           : {
                             url : "_current_", // url to share, default current url
                             text: undefined, // for twitter
                             via : undefined, // for twitter
                             title: undefined, // for stumbleupon, reddit, linkedin
                             summary : undefined, // for linkedin
                             source_url: undefined // for linkedin
                          },

  thumbnails : false,
  thumbnailsParent : "body",
  thumbnailScale   : 0.2,
  thumbnailWidth   : null,
  thumbnailHeight  : null,
  thumbnailsPosition : null, // 'left', 'right', 'top' or 'bottom'
  thumbnailsVertical : true, // or false to get horizontal thumbnails
  thumbnailsContainerWidth  : null,
  thumbnailsContainerHeight : null,
  thumbnailsSprite : null,
  thumbnailsAnimOptions : { }
}; // $.wowBook.defaults

$.wowBook.wowBookConstructor = wowBook;

//
//  Utilities
//

/* paul irish http://www.paulirish.com/2011/requestanimationframe-for-smart-animating */
window.raf = (function(){
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame
   || function(callback){ window.setTimeout(callback, 1000 / 60) }
})();

// Are we using IE in IE8 documentMode ? YES, i know it sucks, but there's a special case (aka bug)
// in IE8 that i did not find another way around  besides using browser detection.
// Same reason for IE7.
$.browser.ie8mode = ($.browser.msie && document.documentMode==8);
$.browser.ie7 = ($.browser.msie && ($.browser.version==7 || document.documentMode==7));

/*
 * rotatePoint
 *
 * rotate a point{x,y}
 *
 * params
 *    point : object {x: number, y:number}
 *    angle : number, angle in radians to rotate the point
 */
function rotatePoint(point, angle) {
  var c=Math.cos(angle),s=Math.sin(angle);
  return { x : c*point.x - s*point.y,
           y : s*point.x + c*point.y }
} // rotatePoint

// returns true if element elem is visible (inside the browser viewport)
function isInViewPort(elem) {
  var viewportHeight = $(window).height(),
    offset = elem.offset(),
    top    = $(window).scrollTop();
  return (offset.top>top) && (offset.top+elem.height() < top+viewportHeight);
} // isInViewPort


// set width and height of element. if CSS box-sizing is not supported,
// make manually the equivalent of CSS box-sizing: border-boxSizingBorderBox
function boxSizingBorderBox(elem, width, height) {
  var pw=0, ph=0;
  if (!$.wowBook.support.boxSizing) {
    var bw = bordersWidth(elem);
    pw = parseFloat(elem.css('paddingLeft'))+parseFloat(elem.css('paddingRight'))+
       bw.left+bw.right;
    ph = parseFloat(elem.css('paddingTop'))+parseFloat(elem.css('paddingBottom'))+
       bw.top+bw.bottom;
  }
  elem.css('width', width-pw);
  elem.css('height', height-ph);
} // boxSizingBorderBox

//
// borderWidth for ie sometimes returns strings for border width
//
var damnIE = ($.browser.msie && $.browser.version<9) ? 1 : 0,
  borderWidths = { thin: 2-damnIE, medium: 4-damnIE, thick: 6-damnIE };

function bordersWidth(e) {
  var t;
  return {
        top    : (e.css('borderTopStyle')=='none' ? 0 : (borderWidths[t=e.css('borderTopWidth')] || parseFloat(t))),
        right  : (e.css('borderRightStyle')=='none' ? 0 : (borderWidths[t=e.css('borderRightWidth')] || parseFloat(t))),
        bottom : (e.css('borderBottomStyle')=='none' ? 0 : (borderWidths[t=e.css('borderBottomWidth')] || parseFloat(t))),
        left   : (e.css('borderLeftStyle')=='none' ? 0 : (borderWidths[t=e.css('borderLeftWidth')] || parseFloat(t)))
    };
};

// Fullscreen utils -based on code by mozilla
var doc = window.document;
var docEl = doc.documentElement;

var _requestFullscreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen ||
                         docEl.webkitRequestFullscreen || docEl.webkitRequestFullScreen,
    requestFullscreen  = function(elem){ return _requestFullscreen.call(elem || docEl) },
    _exitFullscreen    = doc.exitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen ||
                         doc.webkitExitFullscreen || doc.webkitCancelFullScreen,
    exitFullscreen     = function(elem){ return _exitFullscreen.call(doc) },
    fullscreenElement  = function(){ return doc.fullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement ||
                                            doc.webkitFullscreenElement || doc.webkitCurrentFullScreenElement };

$.wowBook.utils = {
  translate : function translate(x,y,z){
    return $.wowBook.useTranslate3d ?
               "translate3d("+x+"px, "+y+"px, "+(z||0)+"px) "
             : "translate("+x+"px, "+y+"px) "
  }, // translate

  isMobile : function(){
    return $(window).width()<=480 || $(window).height()<=480
  } // isMobile

} // $.wowBook.utils

})(jQuery);


/*! Copyright (c) 2011 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.0.6
 *
 * Requires: 1.2.2+
 */

(function($) {

var types = ['DOMMouseScroll', 'mousewheel'];

if ($.event.fixHooks) {
    for ( var i=types.length; i; ) {
        $.event.fixHooks[ types[--i] ] = $.event.mouseHooks;
    }
}

$.event.special.mousewheel = {
    setup: function() {
        if ( this.addEventListener ) {
            for ( var i=types.length; i; ) {
                this.addEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = handler;
        }
    },

    teardown: function() {
        if ( this.removeEventListener ) {
            for ( var i=types.length; i; ) {
                this.removeEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = null;
        }
    }
};

$.fn.extend({
    mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },

    unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
    }
});


function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";

    // Old school scrollwheel delta
    if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta/120; }
    if ( orgEvent.detail     ) { delta = -orgEvent.detail/3; }

    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;

    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
        deltaY = 0;
        deltaX = -1*delta;
    }

    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }

    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);

    return ($.event.dispatch || $.event.handle).apply(this, args);
}

})(jQuery);


//
// Hooks in jQuery for 'transform' and 'transformOrigin'
//
(function($){
  if (!$.cssHooks){
    alert("jQuery 1.4.3+ is needed for this plugin to work");
    return;
  }
  var div = document.createElement('div'),
      prefixes = ['O', 'ms', 'Webkit', 'Moz'];

  // test different vendor prefixes of this property
  function checkSupportFor(propertyName) {
    if (propertyName in div.style) return $.wowBook.support[propertyName] = propertyName;
    var i = prefixes.length,
      p,
      sufix = propertyName.charAt(0).toUpperCase() + propertyName.substr(1);
    while (i--) {
      p = prefixes[i]+sufix;
      if (p in div.style) return $.wowBook.support[propertyName] = p;
    }
  } // checkSupportFor
  checkSupportFor('transform');
  checkSupportFor('transformOrigin');
  checkSupportFor('boxSizing');
  checkSupportFor('zoom');
  // IE7 support boxSizing, but doesn't support border-box.
  // "document.documentMode" is undefined in IE<=7, and is 7(or 5) in IE8+ but with in document mode<=7
  // the line below means "support.boxSizing = false if is IE7- or IE8+ in documentMode<8"
  if ($.wowBook.support.boxSizing && document.documentMode<8) $.wowBook.support.boxSizing = false;

  div = null;
  $.each(["transform", "transformOrigin"], function(i,v){
    if ($.wowBook.support[v] && $.wowBook.support[v]!==v && !$.cssHooks[v]){
      $.cssHooks[v] = {
        get: function(elem, computed, extra){
          return $.css( elem, $.wowBook.support[v] );
        },
        set: function(elem, value){
          elem.style[$.wowBook.support[v]] = value;
        }
      };
    }
  });

  // cssClasses : array
  $.wowBook.applyAlphaImageLoader = function(cssClasses) {
    var filename, i, l, classname,
        style = '',
        part1 = "{background:none; filter : progid:DXImageTransform.Microsoft.AlphaImageLoader(src='",
        part2 = "', sizingMethod='scale'); } ",
        dummy = $("<div style='display:none'></div>").appendTo('body');
    for (i=0,l=cssClasses.length; i<l; i++){
      classname = cssClasses[i];
      dummy.addClass(classname);
      filename = dummy.css('background-image').match(/^url\("(.*)"\)$/);
      if (!filename) continue;
      style += '.'+classname+part1+filename[1]+part2;
      dummy.removeClass(classname);
    }
    $('body').append("<style>"+style+"</style>");
  } // applyAlphaImageLoader

})(jQuery);
