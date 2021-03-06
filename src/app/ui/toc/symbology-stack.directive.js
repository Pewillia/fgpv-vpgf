import {Power1} from 'gsap';
const templateUrl = require('./templates/symbology-stack.html');

const RV_SYMBOLOGY_ITEM_CLASS = '.rv-symbol';
const RV_SYMBOLOGY_ITEM_NAME_CLASS = '.rv-symbol-label';
const RV_SYMBOLOGY_ITEM_TRIGGER = '.rv-symbol-trigger';

const RV_DURATION = 0.3;
const RV_SWIFT_IN_OUT_EASE = Power1;

/**
 * @module rvSymbologyStack
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `rvSymbologyStack` directive generates a symbology list and toggles its visibility. It also wiggles the stacked symbology icons on mouse over and focus.
 *
 * ```html
 * <rv-layer-item-symbology symbology="layer.symbology" container="container"></rv-layer-item-symbology>
 * ```
 *
 */
/**
 * @module SymbologyStack
 * @memberof app.ui
 * @description
 *
 * `SymbologyStack` class provides a common wrapper around symbology list. This can be used in the details panel, in the legend, or other places where layer symbology need to be displayed.
 * There are two sources of symbology: service symbology and user defined symbology.
 *
 */
angular
    .module('app.ui')
    .directive('rvSymbologyStack', rvSymbologyStack)
    .factory('SymbologyStack', symbologyStack);

function rvSymbologyStack($q, Geo, animationService) {
    const directive = {
        require: '^?rvTocEntry', // need access to layerItem to get its element reference
        restrict: 'E',
        templateUrl,
        scope: {
            symbology: '=',
            // stack: '=',
            // symbology.renderStyle: '=?',
            container: '=?'
        },
        link: link,
        controller: () => {},
        controllerAs: 'self',
        bindToController: true
    };

    return directive;

    /*********/

    function link(scope, element) {
        const self = scope.self;

        // if render style is not specified, symbology stack will not be interactive
        // self.isInteractive = typeof self.symbology.renderStyle !== 'undefined';
        self.isExpanded = false; // holds the state of symbology section

        self.expandSymbology = expandSymbology;
        self.fanOutSymbology = fanOutSymbology;

        const ref = {
            isReady: false,

            isFannedOut: false,

            expandTimeline: null, // expand/collapse animation timeline
            fanOutTimeline: null, // wiggle animation timeline

            // store reference to symbology nodes
            // the following are normal arrays of jQuery items, NOT jQuery pseudo-arrays
            symbolItems: [],
            trigger: null, // expand self.trigger node

            // TODO: container width will depend on app mode: desktop or mobile; need a way to determine this
            containerWidth: 350,
            maxItemWidth: 350
        };

        scope.$watchCollection('self.symbology.stack', (newStack, oldStack) => {
            if (newStack) {
                ref.isReady = false;

                // collapse the stack when underlying collection of the symbology changes as the expanded ui stack might initialy had a different number of items
                if (self.isExpanded) {
                    self.expandSymbology(false);
                }
            }
        });

        scope.$watch('self.symbology.expanded', (newValue, oldValue) =>
            newValue !== oldValue ? self.expandSymbology(newValue) : angular.noop);

        scope.$watch('self.symbology.fannedOut', (newValue, oldValue) =>
            newValue !== oldValue ? self.fanOutSymbology(newValue) : angular.noop);


        /* this should not be needed after all
        const eventNameToAction = {
            fanOut: self.fanOutSymbology,
            expand: self.expandSymbology
        };

        scope.$on('symbology', (event, name, value) =>
            eventNameToAction[name](value));
        */

        return true;

        /**
         * Expands the symbology stack to show all its individual elements.
         *
         * @function expandSymbology
         * @private
         * @param {Boolean} value [optional = !self.isExpanded] true will expand the stack; false, collapse the stack;
         */
        function expandSymbology(value = !self.isExpanded) {
            if (!ref.isReady) {
                initializeTimelines();
            }

            if (value) {
                // expand symbology items and reverse wiggle
                ref.expandTimeline.play();
                ref.fanOutTimeline.reverse();
            } else {
                // collapse symbology items and forward play wiggle
                ref.expandTimeline.reverse();
                ref.fanOutTimeline.play();
            }
        }

        /**
         * Fans out the symbology stack; is used to indicate interactive nature of the symbology stack.
         *
         * @function fanOutSymbology
         * @private
         * @param {Boolean} value [optional = !ref.isFannedOut] true will fanOut the stack; false, close the fan;
         */
        function fanOutSymbology(value = !ref.isFannedOut) {
            if (!ref.isReady) {
                initializeTimelines();
            }

            // on mouse over, wiggle only if symbology is not expanded or animating
            if (value && !self.isExpanded && !ref.expandTimeline.isActive()) {
                ref.fanOutTimeline.play();
            } else {
                // on mouse out, set wiggle timeline to 0 if symbology is expanded or animating
                if (ref.expandTimeline.isActive() || self.isExpanded) {
                    ref.fanOutTimeline.pause(0);
                } else if (!self.isExpanded && !ref.expandTimeline.isActive()) { // ... reverse wiggle, if symbology is collapsed and not animating
                    ref.fanOutTimeline.reverse();
                }
            }
        }

        // find and store references to relevant nodes
        function initializeTimelines() {
            if (!self.symbology.isInteractive) {
                return;
            }

            const canvas = document.createElement('canvas');

            // find all symbology items and their parts
            ref.symbolItems = element.find(RV_SYMBOLOGY_ITEM_CLASS)
                .toArray()
                .map(domNode => {
                    domNode = angular.element(domNode);

                    return {
                        container: domNode,
                        image: domNode.find('rv-svg'),
                        label: domNode.find(RV_SYMBOLOGY_ITEM_NAME_CLASS)
                    };
                });

            ref.trigger = element.find(RV_SYMBOLOGY_ITEM_TRIGGER);

            // calculate maximum width of a symbology item based on image, label size and the main panel width
            // symbology item cannot be wider than the panel
            ref.maxItemWidth = Math.min(
                Math.max(
                    ...ref.symbolItems.map(symbolItem =>
                        Math.max(
                            symbolItem.image.find('svg')[0].viewBox.baseVal.width,

                            // TODO: need to use current font size
                            // need to account for letter spacing (use 10 for now)
                            // 32 accounts for paddding, need to get that from styles as well
                            getTextWidth(canvas, symbolItem.label.text(), 'normal 14px Roboto') + 32 + 10
                        ))),
                ref.containerWidth
            );

            // set label width to maximum which was calculated
            ref.symbolItems.forEach(symbolItem =>
                symbolItem.label.css('width', ref.maxItemWidth));

            // console.log('ref.maxItemWidth', ref.maxItemWidth);

            ref.expandTimeline = makeExpandTimeline();
            ref.fanOutTimeline = makeWiggleTimeline();

            ref.isReady = true;
        }

        function makeExpandTimeline() {
            const timeline = animationService.timeLineLite({
                paused: true,
                onStart: () =>
                    (self.isExpanded = true),
                onReverseComplete: () =>
                    (self.isExpanded = false)
            });

            // in pixels
            const symbologyListTopOffset = 48; // offset to cover the height of the legend entry nod
            const symbologyListMargin = 16; // gap between the legend endtry and the symbology stack

            // keep track of the total height of symbology stack so far
            let totalHeight = symbologyListTopOffset + symbologyListMargin;

            // future-proofing - in case we need different behaviours for other legend types
            const legendItemTLgenerator = {
                images: imageLegendItem,
                icons: iconLegendItem
            };

            // loop over ref.symbolItems, generate timeline for each one, increase total height
            ref.symbolItems.reverse().forEach((symbolItem, index) => {
                const heightIncrease = legendItemTLgenerator[self.symbology.renderStyle](timeline, symbolItem, totalHeight,
                    index === ref.symbolItems.length - 1);

                totalHeight += heightIncrease;
            });

            totalHeight += symbologyListMargin; // add margin at the bottom of the list

            // expand layer item container to accomodate symbology list
            // if no container specified, skip this part of animation; as a result, the expanded symbology stack may overflow its parent node
            if (self.container) {
                timeline.to(self.container, RV_DURATION, {
                    marginBottom: totalHeight - symbologyListTopOffset,
                    ease: RV_SWIFT_IN_OUT_EASE
                }, 0);
            }

            // show the self.trigger button
            timeline.to(ref.trigger, RV_DURATION - 0.1, {
                opacity: 1,
                ease: RV_SWIFT_IN_OUT_EASE
            }, 0.1);

            return timeline;
        }

        function makeWiggleTimeline() {
            // we only need one timeline since we can reuse it
            const timeline = animationService.timeLineLite({
                paused: true,
                onStart: () =>
                    (ref.isFannedOut = true),
                onReverseComplete: () =>
                    (ref.isFannedOut = false)
            });

            const displacement = 4;

            // if there is just one icon, don't do on-hover animation
            if (ref.symbolItems.length > 1) {
                // wiggle the first icon in the stack
                timeline.to(ref.symbolItems[0].container, RV_DURATION, {
                    x: `-=${displacement}px`,
                    y: `-=${displacement}px`,
                    ease: RV_SWIFT_IN_OUT_EASE
                }, 0);

                // wiggle the last icon in the stack
                timeline.to(ref.symbolItems.slice(-1)
                    .pop()
                    .container, RV_DURATION, {
                        x: `+=${displacement}px`,
                        y: `+=${displacement}px`,
                        ease: RV_SWIFT_IN_OUT_EASE
                    }, 0);
            }

            return timeline;
        }

        /**
         * Creates timeline for a supplied image-based symbolItem (for wms legends for example)
         * @function imageLegendItem
         * @param  {Object}  timeline       timeline object
         * @param  {Object}  symbolItem symbology object with references to its parts
         * @param  {Number}  totalHeight   height of the legend stack so far
         * @param  {Boolean} isLast        flag indicating this is the last item in the stack
         * @return {Number}                height of this symbology item plus its bottom margin is applicable
         */
        function imageLegendItem(timeline, symbolItem, totalHeight, isLast) {
            const symbologyListItemMargin = 16;

            const imageWidth = symbolItem.image.find('svg')[0].viewBox.baseVal.width;
            const imageHeight = symbolItem.image.find('svg')[0].viewBox.baseVal.height;

            const labelHeight = symbolItem.label.outerHeight();

            // calculate symbology item's dimensions based on max width
            const itemWidth = Math.min(ref.maxItemWidth, imageWidth);
            const itemHeight = imageWidth !== 0 ? itemWidth / imageWidth * imageHeight : 0; // in cases when image urls are broken its size is 0

            // animate symbology container's size
            // note that animate starts at `RV_DURATION / 3 * 2` giving the items time to move down from the stack
            // so they don't overlay legend entry
            timeline.to(symbolItem.container, RV_DURATION / 3 * 2, {
                width: ref.maxItemWidth,
                height: itemHeight + labelHeight,
                left: 0,
                autoAlpha: 1,
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3);

            // move item down
            timeline.to(symbolItem.container, RV_DURATION, {
                top: totalHeight,
                ease: RV_SWIFT_IN_OUT_EASE
            }, 0);

            // animate image width to the calculated width
            timeline.to(symbolItem.image, RV_DURATION / 3 * 2, {
                width: itemWidth,
                height: itemHeight,
                padding: 0, // removes padding from expanded wms legend images making them clearer; TODO: revisit when all symbology is svg items
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3);

            // set width to auto to keep the label centered during animation
            timeline.set(symbolItem.label, {
                display: 'block',
                width: 'auto'
            }, 0);

            // animate symbology label into view
            timeline.to(symbolItem.label, RV_DURATION / 3, {
                opacity: 1,
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3 * 2);

            return itemHeight + labelHeight + (isLast ? 0 : symbologyListItemMargin);
        }

        /**
         * Creates timeline for a supplied icon-based symbolItem (for feature and dynamic legends for example)
         * @function iconLegendItem
         * @param  {Object}  timeline       timeline object
         * @param  {Object}  symbolItem symbology object with references to its parts
         * @param  {Number}  totalHeight   height of the legend stack so far
         * @param  {Boolean} isLast        flag indicating this is the last item in the stack
         * @return {Number}                height of this symbology item plus its bottom margin is applicable
         */
        function iconLegendItem(timeline, symbolItem, totalHeight, isLast) {
            const symbologyListItemMargin = 8;

            const itemSize = 32; // icon size is fixed

            // expand symbology container width and align it to the left (first and last items are fanned out)
            timeline.to(symbolItem.container, RV_DURATION / 3 * 2, {
                width: ref.containerWidth,
                left: 0,
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3);

            // shift the symbology item down to the bottom of the stack using the total height
            timeline.to(symbolItem.container, RV_DURATION, {
                top: totalHeight,
                ease: RV_SWIFT_IN_OUT_EASE
            }, 0);

            // by default, items 3 to n-1 are hidden (their shadows stack otherwise)
            // animate them back into view
            timeline.to(symbolItem.container, RV_DURATION / 3, {
                autoAlpha: 1,
                ease: RV_SWIFT_IN_OUT_EASE
            }, 0);

            // animate image width to the calculated width
            timeline.to(symbolItem.image, RV_DURATION / 3 * 2, {
                width: itemSize,
                height: itemSize,
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3);

            // set label to `block` so it is properly positioned
            timeline.set(symbolItem.label, {
                display: 'block'
            }, RV_DURATION / 3);

            // animate symbology label into view
            timeline.to(symbolItem.label, RV_DURATION / 3 * 2, {
                opacity: 1,
                ease: RV_SWIFT_IN_OUT_EASE
            }, RV_DURATION / 3);

            return itemSize + (isLast ? 0 : symbologyListItemMargin);
        }

        /**
         * Returns width of the supplied text string.
         * @function getTextWidth
         * @param  {Object} canvas cached canvas node
         * @param  {String} text   string of text to measure
         * @param  {String} font   text font and size https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
         * @return {Number}        width of the text
         */
        function getTextWidth(canvas, text, font) {
            const context = canvas.getContext('2d');
            context.font = font;

            // measure text width on the canvas: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText
            const metrics = context.measureText(text);
            return metrics.width;
        }
    }
}

function symbologyStack(ConfigObject, gapiService) {


    class SymbologyStack {
        /**
         * Creates a new symbology stack. All parameters are options and if none is supplied, an empty stack will be created.
         *
         * @param {LayerProxy} proxy [optional = {}] layer proxy object which can supply symbology stack; custom symbols will be used first; if they are not availalbe, symbology stack from the proxy object is used;
         * @param {Array} symbols [optional = []] array of alternative symbology svg graphic elements; can be either [ { name: <String>, svgcode: <String> }, ... ] or [ { text: <String>, image: <String> }, ... ]; the latter example (usually coming from a config file) will be transformed into the format by wrapping images in svg containers;
         * @param {String} renderStyle [optional = ConfigObject.legend.Entry.ICONS] rendering style for symbology stack animation
         * @param {Boolean} isInteractive [optional = false] specifies if the user can interact with the symbology stack
         */
        constructor(proxy = {}, symbols = [], renderStyle = ConfigObject.legend.Entry.ICONS,
            isInteractive = false) {

            this._proxy = proxy;
            this._renderStyle = renderStyle;
            this._isInteractive = isInteractive;

            if (symbols.length === 0) {
                return;
            }

            // custom symbology lists coming from the config file need to be converted to svg first
            if (typeof symbols[0].image !== 'undefined') {
                const renderStyleSwitch = {
                    [ConfigObject.legend.Entry.ICONS]: gapiService.gapi.symbology.listToIconSymbology,
                    [ConfigObject.legend.Entry.IMAGES]: gapiService.gapi.symbology.listToImageSymbology
                };

                this._symbols = renderStyleSwitch[renderStyle](symbols);
            } else {
                this._symbols = symbols;
                this._fannedOut = false;
                this._expanded = false;
            }
        }

        /**
         * @return {Boolean} true if the symbology stack can be expanded by the user; false if not;
         */
        get isInteractive () {  return this._isInteractive; }

        get stack () {          return this._symbols || this._proxy.symbology; }
        get renderStyle () {    return this._renderStyle; }

        get fannedOut () {      return this._fannedOut; }
        set fannedOut (value) {
            this._fannedOut = value;
        }

        get expanded () {       return this._expanded; }
        set expanded (value) {
            this._expanded = value;
        }
    }

    return SymbologyStack;
}
