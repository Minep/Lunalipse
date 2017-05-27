/************************************
 *	Material Javascript Auxilary
 *
 *-----------By Lunaixsky------------
 *
 * Provide basic support for material
 * layout interactive.
 *************************************/
if (typeof jQuery === 'undefined') {
  throw new Error('Nullterial\'s JavaScript requires jQuery')
}

+function ($) {
  'use strict';
  var version = $.fn.jquery.split(' ')[0].split('.')
  if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1)) {
    throw new Error('Nullterial\'s JavaScript requires jQuery version 1.9.1 or higher')
  }
}(jQuery);

//Big Extend
//Mousewheel in jQuery
(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
                    ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.9',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
        },

        getLineHeight: function(elem) {
            return parseInt($(elem)['offsetParent' in $.fn ? 'offsetParent' : 'parent']().css('fontSize'), 10);
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));
//Animate easing
jQuery.easing['jswing'] = jQuery.easing['swing'];
jQuery.extend( jQuery.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert(jQuery.easing.default);
		return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});



var F_SCROLLED = false;
var F_LSTV_EXPAND = false;
var F_SCROLLABLE = true;

var E_ON_EXPANED="evt001";
var E_ON_MSELECT_CHANGE="evt002";
var E_ON_MSWITCH_CHANGE="evt003";
var E_ON_MSDIALG_POS="evt004_p";
var E_ON_MSDIALG_NEG="evt004_n";
var E_ON_SCROLL_COMPLETE="evt_005";
var E_ON_SCROLL_AWAY="evt_006";

var S_ERROR=0;
var S_WARN=1;
var S_SUCCESS=2;

var R_REG001="";
var R_PREV_HEIGHT=0;

var T_TOASTSHORT=2000;
var T_TOASTLONG=5000;


function initMaterial()
{
	// $(".material-ListItem").blur(function(){
	// 	$(".MD-ListContainer>div").removeClass("lst-foc");
	// })
	$(".material-ListItem").click(function(){
		var $Inx = $(this).index();
		$(this).addClass("lst-foc");
		$(".MD-ListContainer>div:not(:eq("+$Inx+"))").removeClass("lst-foc");
		$(".MD-ListContainer>div:eq("+$Inx+")>div[class*='material-progress']").css("display","block");
		$(".MD-ListContainer").trigger(E_ON_EXPANED,[this]);
		//$(".MD-ListContainer>div:eq("+$Inx+")>div[class*='material-progress']").css("display","none");
	})
	$(".mt-dropCtn").click(function(){
		$(this).parent().children(".material-dropbox-list").toggleClass("_mt-override_DBox")
	})
	$(".material-dropbox-list>div").click(function()
	{
		var $reg = $(this).parent()
							.parent()
								.children(".mt-dropCtn")
									.children("span:eq(0)");
		$reg.html($(this).html());
		$reg.attr("data-val",$(this).attr("value"));
		$(this)
			.parent()
				.toggleClass("_mt-override_DBox");
		$(this)
			.parent()
				.parent()
					.trigger(E_ON_MSELECT_CHANGE,
								[	
									this,
									$(this)
										.attr("value")
								]
							);
	});
	$(".mt-dropbox-shell").focusout(function(){
		$(this).children(".material-dropbox-list").removeClass("_mt-override_DBox");
	});
	$(".material-ListItem").focusout(function(){
		$(this).removeClass("lst-foc")
	})
	$(".mt-slide-overlay").click(function(){
		$(".material-slide").toggleSlide();
	})
	$(".material-slider-ListView>li").click(function()
	{
		var i_this = $(this).index();
		if(R_REG001=="")R_REG001=i_this;
		var c_ochild=$(this).children("ul").children();
		if(F_LSTV_EXPAND&&R_REG001==i_this)
		{
			$(this).removeClass("mt-lstView-active");
			$(this)
			.children("ul")
				.css({"height":
						"0px",
					});
			F_LSTV_EXPAND=false;
		}
		else if(F_LSTV_EXPAND&&R_REG001!=i_this)
		{
			var $t = $(".material-slider-ListView>li:not(:eq("+R_REG001+"))");
			$t.removeClass("mt-lstView-active");
			$t
				.children("ul")
					.css({"height":
							"0px"
						});
			$(this).addClass("mt-lstView-active");
			$(this)
			.children("ul")
				.css({"height":
						(c_ochild.height()+16*2)*c_ochild.length+"px"
					});
			F_LSTV_EXPAND=true;
		}
		else if(!F_LSTV_EXPAND&&(R_REG001==i_this||R_REG001!=i_this))
		{
			$(this).addClass("mt-lstView-active");
			$(this)
			.children("ul")
				.css({"height":
						(c_ochild.height()+16*2)*c_ochild.length+"px"
					});
				F_LSTV_EXPAND=true;	
		}
		else
		{
			$(this).removeClass("mt-lstView-active");
			$(this)
			.children("ul")
				.css({"height":
						"0px"
					});
				F_LSTV_EXPAND=false;
		}
		R_REG001=i_this;
		$(".material-slider-ListView>li:not(:eq("+i_this+"))")
			.children("ul")
				.css({"height":"0px"});
		$(".material-slider-ListView>li:not(:eq("+i_this+"))")
			.removeClass("mt-lstView-active");
	})

	$("[data-mtltgl='mtdialog']").click(function(){
		var $$_dia=$($(this).data("tge"));
		$$_dia.css("top","calc(50% - "+$$_dia.height()/2+"px)")
		$$_dia.css("left","calc(50% - "+$$_dia.width()/2+"px)")
		$$_dia.toggleClass("mt-dia-popup");
		$$_dia.toggleMask();
		//$("body").toggleClass("mt-overaly-active-body-behavior");
	})

	$("[data-mtltgl='dia_negative']").click(function()
	{
		$(this).parent().parent().trigger(E_ON_MSDIALG_NEG);
	})
	$("[data-mtltgl='dia_positive']").click(function()
	{
		$(this).parent().parent().trigger(E_ON_MSDIALG_POS);
	})

	$("[data-msg]").mouseenter(function()
	{
		var $this_x=$(this).offset().left;
		var $this_y=$(this).offset().top;
		var $this_h=$(this).height();
		var $this_w=$(this).width();
		var $this_p=$(this).css("padding-top");
		var $this_p_l=$(this).css("padding-left");
		$("body")
			.append(
				"<div class=\"material-tooltip mt-amin\">"+
					$(this).data("msg")+
				"</div>");
		$(".material-tooltip")
			.css({
					"top":"calc("+
						($this_y-$(document).scrollTop()+$this_h)+
						"px + "+
						$this_p+" * 2 + 14px)",
					"left":"calc("+(($this_x+($this_w/2))-($(".material-tooltip").width()/2))+"px + "+$this_p_l+")",
					"opacity":"1"
				})
	});
	$("[data-msg]").mouseleave(function()
	{
		$(".material-tooltip")
			.css("opacity","0");
		$(".material-tooltip").remove();
	})
	$(".material-switch").click(function()
	{
		$(this).toggleClass("mt-switch-active");
		$(this).trigger(E_ON_MSWITCH_CHANGE,[$(this).hasClass("mt-switch-active")]);
	})
}

function setupTitleBar()
{
	var header_h=$(".md-head").height();
	$(window).scroll(function(){
		if(header_h!=null&&header_h<=$(window).scrollTop())
		{
			if(!F_SCROLLED)
			{
				$(".material-tbar").css({"top":"0"});
				F_SCROLLED=true;
			}
		}
		else
		{
			if(F_SCROLLED)
			{
				$(".material-tbar").css({"top":"-"+$(".material-tbar").height()+"px"});
				F_SCROLLED=false;
			}
		}
	})
}
function getDelta(curH)
{
	if((curH-R_PREV_HEIGHT)>0)
	{
		R_PREV_HEIGHT=curH;return 1;
	}
	else if((curH-R_PREV_HEIGHT)<0)
	{
		R_PREV_HEIGHT=curH;return -1;
	}
	else
	{
		R_PREV_HEIGHT=curH;return 0;
	}
}

/* ------ Extend ------- */
$.fn.selectedItem = function(){
	var $t_invoker=$(this);
	if($t_invoker.hasClass("material-dropbox"))
	{
		return $t_invoker
				.children(".mt-dropCtn")
					.children("span:eq(0)")
						.attr("data-val");
	}
}
$.fn.toggleSlide = function()
{
	var $t_invoker=$(this);
	if($t_invoker.hasClass("material-slide"))
	{
		$t_invoker.toggleClass("mt-slide-active");
		$(".mt-slide-overlay").toggleClass("mt-overlay-active");
		$("body").toggleClass("mt-overaly-active-body-behavior");
	}
}
$.fn.toggleMask = function()
{
	$(".mt-overlay").toggleClass("mt-overlay-active");
	$("body").toggleClass("mt-overaly-active-body-behavior");
}
$.fn.setStatus = function(st){
	switch(st)
	{
		case S_SUCCESS:
			$(this).css("border-bottom","2px solid #3C763D");
			break;
		case S_ERROR:
			$(this).css("border-bottom","2px solid #A94442");
			break;
		case S_WARN:
			$(this).css("border-bottom","2px solid #8A6D3B");
			break;
	}
}
$.fn.Mtswitch = function(sw)
{
	if(sw==undefined||sw==null)
	{
		return $(this).hasClass("mt-switch-active");
	}
	else
	{
		if(sw)
		{
			$(this).addClass("mt-switch-active");
		}
		else
		{
			$(this).removeClass("mt-switch-active");
		}
	}
}
$.fn.toggleDialogViewable = function()
{
	$(this).toggleClass("mt-dia-popup");
	$(this).toggleMask();
}
$.fn.Toast = function(msg,toastT)
{
	var $toast_body="<span class=\"material-toast\">"+
						msg+
					"</span>";
	$("body").append($toast_body);
	var $len = $(".material-toast").width();
	$(".material-toast").css({
		"bottom":"20px",
		"left":"calc(50% - "+$len+"px / 2)"
	})
	window.setTimeout(function(){
		$(".material-toast").animate({"opacity":"1"},500,function()
		{
			window.setTimeout(function(){
				$(".material-toast").animate({"opacity":"0"},function()
				{
					$(".material-toast").remove();
				})
			},toastT);
		})
	},600)
}
$.fn.NParallax = function(opts)
{
	var $invoker = $(this);
	var $idlist="";
	var prev=0;
	var offset=0;
	var $options = $.extend({
		imgParallax:["#i1","#i2"],
		velocity:0.5,
		speed:0.05
	},opts);
	for (var i = 0; i < $options.imgParallax.length; i++) {
		$idlist+=$options.imgParallax[i]+","
	}
	$idlist=$idlist.substring(0,$idlist.length - 1)
	$(window).scroll(function(){
		offset = $(window).scrollTop()*$options.speed*$options.velocity;
		$($idlist).css("background-position-y","-"+offset+"px")
		prev=$(window).scrollTop();
	});
}
$.fn.NScroll = function(opts)
{
	var $options = $.extend({
		Scroll:["#main","#main2"],
		speed:600,
		easing:"easing",
		enableCallBack:true
	},opts);
	var totalH = $("body").height();
	var n=0,c=0;
	$(window).mousewheel(function(event, delta, deltaX, deltaY)
	{
		//console.log(delta)
		if(F_SCROLLABLE)
		{
			c-=delta;
			if(c>=0&&c<$options.Scroll.length)
			{
				F_SCROLLABLE=false;
				var c_=$options.Scroll[c];
				var n_=$options.Scroll[n];
				$(this).trigger(E_ON_SCROLL_AWAY,[n]);
				$(c_).animate({"top":"-"+(totalH*c)+"px"},$options.speed,$options.easing);
				$(n_).animate({"top":"-"+(totalH*c)},$options.speed,$options.easing,function()
				{
					F_SCROLLABLE=true;
					n=c;
					if($options.enableCallBack)$(this).trigger(E_ON_SCROLL_COMPLETE,[n]);
				});
			}
			else
			{
				c=n;
			}
		}
	})
}