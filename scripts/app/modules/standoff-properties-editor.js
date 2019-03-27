(function (factory) {
    define("speedy/editor", ["app/utils"], factory);
}(function (utils) {

    var where = utils.where;
    var each = utils.each;
    var find = utils.find;
    var select = utils.select;
    var maxWhile = 10000;

    Array.prototype.where = function (func) {
        return where(this, func);
    };
    Array.prototype.each = function (func) {
        return each(this, func);
    };

    const TEXT_STREAM = {
        IN: 0,
        OUT: 1
    };
    const ELEMENT_ROLE = {
        CHAR: 0,
        BLOCK: 1,
        ROOT: 2,
        OVERLAY: 3
    };

    const BACKSPACE = 8,
        DELETE = 46, HOME = 36, END = 35,
        LEFT_ARROW = 37, RIGHT_ARROW = 39, UP_ARROW = 38, DOWN_ARROW = 40, SPACE = 32,
        SHIFT = 16, CTRL = 17, ALT = 18, ENTER = 13, LINE_FEED = 10, TAB = 9, LEFT_WINDOW_KEY = 91, SCROLL_LOCK = 145,
        RIGHT_WINDOW_KEY = 92, F1 = 112;

    function hasProperties(obj) {
        if (!obj) {
            return false;
        }
        return Object.getOwnPropertyNames(obj).length;
    }

    function getRangeText(range) {
        if (!range) {
            return null;
        }
        var text = "";
        whileNext(range.start, range.end, function (node) {
            if (!node.speedy) {
                return;
            }
            if (node.speedy.stream == TEXT_STREAM.OUT) {
                return;
            }
            text += node.textContent;
        });
        return text;
    }

    function getParent(startNode, func) {
        var s = startNode, loop = true;
        var c = 0;
        while (loop) {
            if (func(s)) {
                return s;
            }
            if (s) {
                s = s.parentElement;
            } else {
                loop = false;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", { method: "editor.getParent", s });
                return s;
            }
        }
        return null;
    }

    function allNodesBetween(startNode, endNode) {
        var nodes = [];
        whileNext(startNode, endNode, function (node) {
            nodes.push(node);
        });
        return nodes;
    }

    function whileNext(startNode, endNode, func) {
        var c = 0;
        var loop = true;
        if (!startNode || !endNode) {
            return;
        }
        startNode = (startNode.speedy ? startNode : getParent(startNode, n => n.speedy));
        endNode = (endNode.speedy ? endNode : getParent(endNode, n => n.speedy));
        var node = startNode;
        if (isBlock(node)) {
            node = node.firstChild;
        }
        while (loop) {
            func(node);
            if (node == endNode) {
                loop = false;
                continue;
            }
            if (isOutOfTextStream(node)) {
                node = node.nextElementSibling
                continue;
            }
            var next = node.nextElementSibling;
            if (next) {
                if (isBlock(next)) {
                    node = next.firstChild;
                    continue;
                }
            } else {
                if (hasBlockParent(node)) {
                    node = node.parentElement.nextElementSibling;
                    continue;
                }
                else {
                    loop = false;
                    continue;
                }
            }
            node = node.nextElementSibling;
            if (c++ > maxWhile) {
                console.log("Exceeded maximum iterations", {
                    method: "whileNext", startNode, endNode, node
                });
                return node;
            }
        };
    }

    function isAfter(start, node) {
        var c = 0;
        var found = false;
        var loop = true;
        var temp = node;
        while (loop && temp) {
            if (start == temp) {
                loop = false;
                found = true;
            }
            if (temp.previousElementSibling == null) {
                if (hasBlockParent(temp)) {
                    temp = temp.parentElement;
                }
                else {
                    loop = false;
                    continue;
                }
            }
            temp = temp.previousElementSibling;
            if (c++ > maxWhile) {
                console.log("Exceeded maximum iterations", {
                    method: "isAfter", start, node
                });
                return found;
            }
        }
        return found;
    }

    function isBefore(start, node) {
        var c = 0;
        var found = false;
        var loop = true;
        var cursor = node;
        while (loop && cursor) {
            if (start == cursor) {
                loop = false;
                found = true;
            }
            if (cursor.nextElementSibling == null) {
                if (hasBlockParent(cursor)) {
                    cursor = cursor.parentElement;
                }
                else {
                    loop = false;
                    continue;
                }
            }
            cursor = cursor.nextElementSibling;
            if (c++ > maxWhile) {
                console.log("Exceeded maximum iterations", {
                    method: "isBefore", start, node
                });
                return found;
            }
        }
        return found;
    }

    function isWithin(start, end, node) {
        var si = nodeIndex(start), ei = nodeIndex(end), ni = nodeIndex(node);
        return si <= ni && ni <= ei;
    }

    function indexOf(arr, comparer) {
        for (var i = 0; i < arr.length; i++) {
            if (comparer(arr[i])) {
                return i;
            }
        }
        return -1;
    }

    function hasBlockParent(node) {
        return node && node.parentElement && isBlock(node.parentElement);
    }

    function getTextContent(node) {
        // This may need to be changed to account for zero-width joining characters.
        return node.textContent[0];
    }

    function isBlock(node) {
        return node && node.speedy && node.speedy.role == ELEMENT_ROLE.BLOCK;
    }

    function isChar(node) {
        return node && node.speedy && node.speedy.role == ELEMENT_ROLE.CHAR;
    }

    function isOutOfTextStream(node) {
        return node && node.speedy && node.speedy.stream == TEXT_STREAM.OUT;
    }

    function isInTextStream(node) {
        return node && node.speedy && node.speedy.stream == TEXT_STREAM.IN;
    }

    function markNodesWithIndexes(node) {
        var i = 0;
        var c = 0;
        var text = "";
        var loop = true;
        node = (node.speedy ? node : getParent(node, n => n.speedy));
        if (isBlock(node)) {
            node = node.firstChild;
        }
        while (loop && node) {
            if (isOutOfTextStream(node)) {
                node.speedy.index = i;
                node = node.nextElementSibling
                continue;
            }
            text += getTextContent(node);
            node.speedy.index = i++;
            var next = node.nextElementSibling;
            if (next) {
                if (isBlock(next)) {
                    node = next.firstChild;
                    continue;
                }
            } else {
                if (hasBlockParent(node)) {
                    node = node.parentElement.nextElementSibling;
                    continue;
                }
                else {
                    loop = false;
                    continue;
                }
            }
            node = node.nextElementSibling;
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", {
                    method: "markNodesWithIndexes", i, node
                });
                return node;
            }
        };
        return text;
    }

    function previousUntil(start, func) {
        var loop = true;
        var node = start;
        var c = 0;
        while (loop) {
            var previous = node.previousElementSibling;
            if (!previous) {
                if (node.speedy.role == ELEMENT_ROLE.BLOCK) {
                    node = node.lastChild;
                }
                else {
                    var parent = node.parentElement;
                    if (parent.speedy.role == ELEMENT_ROLE.BLOCK) {
                        node = parent.previousElementSibling;
                        continue;
                    }
                }
            } else {
                node = previous;
            }
            if (func(node)) {
                loop = false;
                continue;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", {
                    method: "previousUntil", start, node
                });
                return node;
            }
        }
        return node;
    }

    function nextUntil(start, func) {
        var loop = true;
        var node = start;
        var c = 0;
        while (loop) {
            var next = node.nextElementSibling;
            if (!next) {
                var parent = node.parentElement;
                if (parent.speedy.role == ELEMENT_ROLE.BLOCK) {
                    node = parent.nextElementSibling;
                    continue;
                }
            } else {
                node = next;
            }
            if (func(node)) {
                loop = false;
                continue;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", {
                    method: "nextUntil", start, node
                });
                return node;
            }
        }
        return node;
    }

    function firstPreviousChar(start) {
        var char = previousUntil(start, node => {
            return node.speedy.role == ELEMENT_ROLE.CHAR && node.speedy.stream == TEXT_STREAM.IN;
        });
        return char;
    }

    function firstNextChar(start) {
        var char = nextUntil(start, node => {
            return node.speedy.role == ELEMENT_ROLE.CHAR && node.speedy.stream == TEXT_STREAM.IN;
        });
        return char;
    }

    function nodeIndex(node) {
        var i = -1;
        var c = 0;
        if (!node) {
            return i;
        }
        node = (node.speedy ? node : getParent(node, n => n && n.speedy));
        while (node) {
            if (isInTextStream(node)) {
                i++;
            }            
            if (isChar(node)) {
                var previous = node.previousElementSibling;
                if (previous == null) {
                    if (hasBlockParent(node)) {
                        previous = node.parentElement.previousElementSibling;
                    }
                }
                node = previous;
            }
            if (isBlock(node)) {
                node = node.lastChild;
            }
            if (node && node.speedy.role == ELEMENT_ROLE.OVERLAY) {
                node = node.parentElement;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", {
                    method: "nodeIndex", i, node
                });
                return node;
            }
        };
        return i;
    }

    function indexNode(start, index) {
        var i = 0;
        var node = start;
        var c = 0;
        while (i != index) {
            if (isInTextStream(node)) {
                i++;
            }
            if (isChar(node)) {
                var next = node.nextElementSibling;
                if (next == null) {
                    if (hasBlockParent(node)) {
                        next = node.parentElement.nextElementSibling;
                    }
                }
                node = next;
            }
            if (isBlock(node)) {
                node = node.firstChild;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", {
                    method: "indexNode", i, node
                });
                return node;
            }
        };
        return node;
    }

    function any(arr, comparer) {
        return indexOf(arr, comparer) > -1;
    }

    function first(nodelist, comparer) {
        for (var i = 0; i < nodelist.length; i++) {
            var n = nodelist[i];
            if (comparer(n)) {
                return n;
            }
        }
        return null;
    }

    function remove(arr, item) {
        var i = indexOf(arr, function (x) { return x == item; });
        if (i > -1) {
            arr.splice(i, 1);
        }
    }

    function unsetSpanRange(span, className) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        if (div) {
            span.removeChild(div);
        }
    }

    function setLayer(span, className, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        if (div) {
            div.setAttribute("data-layer", layer);
        }
    }

    function hideLayer(span, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.getAttribute("data-layer") == layer; });
        if (div) {
            div.style.visibility = "hidden";
        }
    }

    function showLayer(span, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.getAttribute("data-layer") == layer; });
        if (div) {
            div.style.visibility = "visible";
        }
    }

    var propCounter = 0;
    var Property = (function () {
        function Property(cons) {
            cons = cons || {};
            this.editor = cons.editor;
            this.guid = cons.guid;
            this.index = cons.index;
            this.className = cons.className;
            this.type = cons.type;
            this.value = cons.value;
            this.layer = cons.layer;
            this.text = cons.text;
            this.startNode = cons.startNode;
            this.endNode = cons.endNode;
            this.bracket = {
                left: null,
                right: null
            };
            this.attributes = cons.attributes || {};
            this.isZeroPoint = cons.isZeroPoint || false;
            this.isDeleted = cons.isDeleted;
        }
        Property.prototype.addLeftBracket = function (node) {
            this.bracket.left = node;
        };
        Property.prototype.addRightBracket = function (node) {
            this.bracket.right = node;
        };
        Property.prototype.showBrackets = function () {
            if (this.bracket.left) {
                this.bracket.left.style.display = "inline";
            }
            if (this.bracket.right) {
                this.bracket.right.style.display = "inline";
            }
        };
        Property.prototype.hideBrackets = function () {
            if (this.bracket.left) {
                this.bracket.left.style.display = "none";
            }
            if (this.bracket.right) {
                this.bracket.right.style.display = "none";
            }
        };
        Property.prototype.bracketsVisible = function () {
            return false;
        };
        Property.prototype.overRange = function (func) {
            whileNext(this.startNode, this.endNode, func);
        };
        Property.prototype.highlight = function () {
            var _this = this;
            if (this.isZeroPoint) {
                return;
            }
            var css = this.editor.css.highlight || "text-highlight";
            this.overRange(s => s.classList.add(css));
        };
        Property.prototype.unhighlight = function () {
            if (this.isZeroPoint) {
                return;
            }
            var css = this.editor.css.highlight || "text-highlight";
            this.overRange(s => s.classList.remove(css));
        };
        Property.prototype.startIndex = function () {
            if (!this.startNode) {
                return null;
            }
            if (typeof this.startNode.speedy.index != "undefined") {
                return this.startNode.speedy.index;
            }
            return nodeIndex(this.startNode);
        };
        Property.prototype.endIndex = function () {
            if (!this.endNode) {
                return null;
            }
            if (typeof this.endNode.speedy.index != "undefined") {
                return this.endNode.speedy.index;
            }
            if (this.endNode.speedy.stream == TEXT_STREAM.OUT) {
                return null;
            }
            return nodeIndex(this.endNode);
        };
        Property.prototype.convertToZeroPoint = function () {
            var zero = this.clone();
            var nextElement = this.endNode.nextElementSibling;
            var range = { start: this.startNode, end: this.endNode };
            var text = getRangeText(range);
            this.editor.deleteRange(range);
            var span = this.editor.newSpan(text);
            span.speedy.stream = TEXT_STREAM.OUT;
            zero.isZeroPoint = true;
            zero.text = text;
            zero.startNode = span;
            zero.endNode = span;
            this.editor.container.insertBefore(span, nextElement);
            zero.startNode.startProperties.push(zero);
            zero.setSpanRange();
            remove(this.editor.data.properties, this);
            this.editor.data.properties.push(zero);
            this.editor.setMonitor();
        };
        Property.prototype.setZeroPointLabel = function (text) {
            this.startNode.textContent = text;
            this.text = text;
        };
        Property.prototype.hideSpanRange = function () {
            var _this = this;
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "decorate") {
                    s.classList.remove(className);
                } else if (propertyType.format == "overlay") {
                    hideLayer(s, this.layer);
                }
            }.bind(this));
        };
        Property.prototype.shiftStartProperties = function (from, to) {
            remove(from.startProperties, this);
            to.startProperties.push(this);
        };
        Property.prototype.shiftEndProperties = function (from, to) {
            remove(from.endProperties, this);
            to.endProperties.push(this);
        };
        Property.prototype.shiftNodeLeft = function (node) {
            /*
            Needs sibling boundary checks (out of stream, etc.).
            */
            if (!node) {
                return;
            }
            var previous = node.previousElementSibling;
            if (!previous) {
                return;
            }
            node.parentElement.insertBefore(node, previous);
        };
        Property.prototype.shiftNodeRight = function (node) {
            /*
            Needs sibling boundary checks (out of stream, etc.).
            */
            if (!node) {
                return;
            }
            var nextOneOver = node.nextElementSibling.nextElementSibling;
            if (!nextOneOver) {
                return;
            }
            node.parentElement.insertBefore(node, nextOneOver);
        };
        Property.prototype.shiftBracketsLeft = function () {
            this.shiftNodeLeft(this.bracket.left);
            this.shiftNodeLeft(this.bracket.right);
        };
        Property.prototype.shiftBracketsRight = function () {
            this.shiftNodeRight(this.bracket.left);
            this.shiftNodeRight(this.bracket.right);
        };
        Property.prototype.getPreviousCharNode = function (node) {
            /**
             * To do: rewrite to handle out of stream, etc.
             */
            return firstPreviousChar(node);
            // return node.previousElementSibling;
        };
        Property.prototype.getNextCharNode = function (node) {
            /**
             * To do: rewrite to handle out of stream, etc.
             */
            return firstNextChar(node);
            // return node.nextElementSibling;
        };
        Property.prototype.shiftLeft = function () {
            this.unsetSpanRange();
            var previousStartNode = this.getPreviousCharNode(this.startNode);
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.shiftStartProperties(this.startNode, previousStartNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
            this.startNode = previousStartNode;
            this.endNode = previousEndNode;
            this.shiftBracketsLeft();
            this.setSpanRange();
        };
        Property.prototype.shiftRight = function () {
            this.unsetSpanRange();
            var nextStartNode = this.getNextCharNode(this.startNode);
            var nextEndNode = this.getNextCharNode(this.endNode);
            this.shiftStartProperties(this.startNode, nextStartNode);
            this.shiftEndProperties(this.endNode, nextEndNode);
            this.startNode = nextStartNode;
            this.endNode = nextEndNode;
            this.shiftBracketsRight();
            this.setSpanRange();
        };
        Property.prototype.expand = function () {
            this.unsetSpanRange();
            var nextEndNode = this.getNextCharNode(this.endNode);
            this.shiftEndProperties(this.endNode, nextEndNode);
            this.endNode = nextEndNode;
            this.shiftNodeRight(this.bracket.right);
            this.setSpanRange();
        };
        Property.prototype.contract = function () {
            this.unsetSpanRange();
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
            this.endNode = previousEndNode;
            this.shiftNodeLeft(this.bracket.right);
            this.setSpanRange();
        };
        Property.prototype.getPropertyType = function () {
            var _ = this;
            return find(this.editor.propertyType, function (item, key) {
                return key == _.type;
            });
        };
        Property.prototype.unsetSpanRange = function () {
            var _this = this;
            var propertyType = this.getPropertyType();
            if (propertyType.format == "block") {
                var spans = allNodesBetween(this.startNode, this.endNode);
                var parent = this.startNode.parentElement;
                var container = parent.parentElement;
                var insertionPoint = parent.nextElementSibling ? parent.nextElementSibling : parent.previousElementSibling;
                spans.forEach(span => container.insertBefore(span, insertionPoint));
                container.removeChild(parent);
            } else {
                whileNext(this.startNode, this.endNode, function (s) {
                    var className = _this.className || propertyType.className || propertyType.zeroPoint.className;
                    if (propertyType.format == "decorate") {
                        s.classList.remove(className);
                    } else if (propertyType.format == "overlay") {
                        unsetSpanRange(s, className);
                    }
                }.bind(this));
            }
            if (propertyType.unstyleRenderer) {
                propertyType.unstyleRenderer(allNodesBetween(this.startNode, this.endNode), this);
            }
        };
        Property.prototype.showSpanRange = function () {
            var _this = this;
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "decorate") {
                    s.classList.add(className);
                } else if (propertyType.format == "overlay") {
                    showLayer(s, this.layer);
                }
            }.bind(this));
        };
        Property.prototype.setSpanRange = function () {
            var _this = this;
            if (this.isDeleted) {
                return;
            }
            var propertyType = this.getPropertyType();
            if (!propertyType) {
                return;
            }
            var format = propertyType.format;
            whileNext(this.startNode, this.endNode, function (s) {
                if (s.speedy.role != ELEMENT_ROLE.CHAR || s.speedy.stream != TEXT_STREAM.IN) {
                    return;
                }
                var className = _this.className || (_this.isZeroPoint ? propertyType.zeroPoint.className : propertyType.className);
                if (format == "decorate" || _this.isZeroPoint) {
                    s.classList.add(className);
                } else if (format == "overlay" && !_this.isZeroPoint) {
                    var inner = document.createElement("SPAN");
                    inner.speedy = {
                        role: ELEMENT_ROLE.OVERLAY,
                        stream: TEXT_STREAM.OUT
                    };
                    inner.setAttribute("data-layer", this.layer);
                    inner.classList.add("overlaid");
                    inner.classList.add(className);
                    s.appendChild(inner);
                }
            }.bind(this));
            if (propertyType.styleRenderer) {
                propertyType.styleRenderer(allNodesBetween(this.startNode, this.endNode), this);
            }
        };
        Property.prototype.getText = function () {
            return getRangeText({ start: this.startNode, end: this.endNode });
        };
        Property.prototype.setLayer = function (layer) {
            this.layer = layer;
            whileNext(this.startNode, this.endNode, function (s) {
                setLayer(s, this.type, layer);
            }.bind(this));
        }
        Property.prototype.remove = function () {
            this.isDeleted = true;
            this.unsetSpanRange();
            this.editor.updateCurrentRanges(this.endNode);
            this.editor.clearMonitors();
            if (this.editor.onPropertyDeleted) {
                this.editor.onPropertyDeleted(this);
            }
            if (this.isZeroPoint) {
                this.startNode.remove();
            }
            this.hideBrackets();
            if (!this.guid) {
                remove(this.editor.data.properties, this);
            }
        };
        Property.prototype.clone = function () {
            var clone = new Property(this);
            clone.text = this.text;
            clone.startNode = this.startNode;
            clone.endNode = this.endNode;
            clone.className = this.className;
            clone.guid = this.guid;
            clone.type = this.type;
            clone.layer = this.layer;
            clone.value = this.value;
            clone.isDeleted = this.isDeleted;
            clone.index = this.index;
            clone.isZeroPoint = this.isZeroPoint;
            clone.attributes = this.attributes;
            if (this.editor.onPropertyCloned) {
                this.editor.onPropertyCloned(clone, this);
            }
            return clone;
        };
        Property.prototype.toNode = function () {
            var __ = this;
            var text = null;
            var si = this.startIndex();
            var ei = this.endIndex();
            if (this.isZeroPoint) {
                text = this.startNode.textContent;
            }
            else {
                var len = ei - si + 1;
                if (len > 0) {
                    len = this.editor.unbinding.maxTextLength || len;
                    var statementText = this.editor.temp.text || this.editor.unbindText();
                    text = statementText.substr(si, len);
                }
            }
            var data = {
                index: this.index,
                guid: this.guid || null,
                className: this.className,
                type: this.type,
                layer: this.layer,
                text: text,
                value: this.value,
                startIndex: si,
                endIndex: ei,
                attributes: this.attributes,
                isZeroPoint: !!this.isZeroPoint,
                isDeleted: this.isDeleted || false
            };
            if (this.editor.onPropertyUnbound) {
                this.editor.onPropertyUnbound(data, this);
            }
            return data;
        };
        return Property;
    })();

    var Editor = (function () {
        function Editor(cons) {
            this.container = (cons.container instanceof HTMLElement) ? cons.container : document.getElementById(cons.container);
            if (cons.direction == "RTL") {
                this.container.style.direction = "RTL";
            }
            this.monitors = [];
            this.temp = {
                text: null
            };
            this.onCharacterAdded = cons.onCharacterAdded;
            this.onCharacterDeleted = cons.onCharacterDeleted;
            this.onPropertyCreated = cons.onPropertyCreated;
            this.onPropertyChanged = cons.onPropertyChanged;
            this.onPropertyDeleted = cons.onPropertyDeleted;
            this.onPropertyUnbound = cons.onPropertyUnbound;
            this.onPropertyCloned = cons.onPropertyCloned;
            this.onMonitorUpdated = cons.onMonitorUpdated;
            this.unbinding = cons.unbinding || {};
            this.lockText = cons.lockText || false;
            this.lockProperties = cons.lockProperties || false;
            this.css = cons.css || {};
            this.data = {
                text: null,
                properties: []
            };
            this.publisher = {
                layerAdded: []
            };
            this.propertyType = cons.propertyType;
            this.commentManager = cons.commentManager;
            this.setupEventHandlers();
        };
        Editor.prototype.clearMonitors = function () {
            this.monitors.forEach(x => x.clear());
        };
        Editor.prototype.setLayerVisibility = function (layer, show) {
            this.data.properties
                .where(function (prop) { return prop.layer == layer; })
                .each(function (prop) {
                    if (show) {
                        prop.showSpanRange();
                    } else {
                        prop.hideSpanRange();
                    }
                });
        };
        Editor.prototype.onLayerAdded = function (handler) {
            this.publisher.layerAdded.push(handler);
        };
        Editor.prototype.layerAdded = function (e) {
            each(this.publisher.layerAdded, function (handler) {
                try {
                    handler(e);
                }
                catch (ex) {
                    console.log(ex);
                }
            });
        };
        Editor.prototype.setupEventHandlers = function () {
            this.container.addEventListener("dblclick", this.handleDoubleClickEvent.bind(this));
            this.container.addEventListener("keydown", this.handleKeyDownEvent.bind(this));
            this.container.addEventListener("mouseup", this.handleMouseUpEvent.bind(this));
            this.container.addEventListener("paste", this.handleOnPasteEvent.bind(this));
        };
        Editor.prototype.getPropertyAtCursor = function () {
            var _this = this;
            var node = this.getCurrent();
            var enclosing = this.data.properties.where(function (prop) {
                return isWithin(prop.startNode, prop.endNode, node);
            });
            if (!enclosing.length) {
                return null;
            }
            var i = nodeIndex(node);
            var ordered = enclosing.sort(function (a, b) {
                var da = i - a.startIndex();
                var db = i - b.startIndex();
                return da > db ? 1 : da == db ? 0 : -1;
            });
            var nearest = ordered[0];
            return nearest;
        };
        Editor.prototype.handleDoubleClickEvent = function (e) {
            var _this = this;
            var props = this.data.properties.where(function (prop) {
                var propertyType = prop.getPropertyType();
                return propertyType && propertyType.propertyValueSelector && isWithin(prop.startNode, prop.endNode, e.target);
            });
            if (!props.length) {
                return;
            }
            var i = nodeIndex(e.target);
            var nearest = props.sort(function (a, b) {
                var da = i - a.startIndex();
                var db = i - b.startIndex();
                return da > db ? 1 : da == db ? 0 : -1;
            })[0];
            if (!nearest) {
                return;
            }
            var property = this.propertyType[nearest.type];
            property.propertyValueSelector(nearest, function (guid, name) {
                if (guid) {
                    nearest.value = guid;
                    nearest.name = name;
                    nearest.setSpanRange();
                    if (_this.onPropertyChanged) {
                        _this.onPropertyChanged(nearest);
                    }
                }
            });
        };
        Editor.prototype.addMonitor = function (monitor) {
            this.monitors.push(monitor);
        };
        Editor.prototype.updateCurrentRanges = function (span) {
            var _this = this;
            window.setTimeout(function () {
                if (!span) {
                    span = _this.getCurrent();
                }
                _this.setMonitor([]);
                var props = where(this.data.properties, function (prop) {
                    return !prop.isDeleted && prop.startNode && prop.endNode && isWithin(prop.startNode, prop.endNode, span);
                });
                _this.setMonitor(props || []);
            }.bind(this), 1);
        };
        Editor.prototype.deleteAnnotation = function (type) {
            var current = this.getCurrent();
            var enclosing = where(this.data.properties, function (prop) {
                return !prop.isDeleted && prop.type == type && isWithin(prop.startNode, prop.endNode, current);
            });
            if (enclosing.length != 1) {
                return;
            }
            enclosing[0].remove();
        };
        Editor.prototype.setMonitor = function (props) {
            var _this = this;
            window.setTimeout(function () {
                _this.monitors.forEach(x => x.setProperties(props));
            }, 1);
        };
        Editor.prototype.handleMouseClickEvent = function (evt) {
            this.updateCurrentRanges();
        };
        Editor.prototype.handleMouseUpEvent = function (evt) {
            this.updateCurrentRanges(evt.target);
        };
        // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
        Editor.prototype.handleOnPasteEvent = function (e) {
            var _this = this;
            e.stopPropagation();
            e.preventDefault();
            var clipboardData = e.clipboardData || window.clipboardData;
            var text = clipboardData.getData('text');
            var len = text.length;
            var frag = this.textToDocumentFragment(text);
            if (this.container.children.length) {
                this.container.insertBefore(frag, e.target.nextElementSibling);
            } else {
                this.container.appendChild(frag);
            }
            if (this.onCharacterAdded) {
                var start = e.target;
                var end = e.target;
                while (len--) {
                    end = this.getNextCharacterNode(end);
                }
                whileNext(start, end, (span) => {
                    _this.onCharacterAdded(span, _this);
                });
            }
            this.setCarotByNode(e.target);
            this.updateCurrentRanges();
        };
        Editor.prototype.insertCharacterAtCarot = function (c) {
            var isFirst = !this.container.children.length;
            var current = this.getCurrent();
            var span = this.newSpan();
            span.textContent = c;
            if (isFirst) {
                this.container.appendChild(span);
                this.setCarotByNode(span);
            }
            else {
                var atFirst = !current;
                var next = atFirst ? this.container.firstChild : current.nextElementSibling;
                this.container.insertBefore(span, next);
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            this.updateCurrentRanges();
        };
        Editor.prototype.erase = function () {
            var _this = this;
            var range = this.getSelectionNodes();
            if (range == null) {
                return;
            }
            var sn = range.start;
            var en = range.end;

            // NB: assume the simple case of erasing INSIDE property ranges; other cases to follow later.

            var properties = this.getPropertiesTraversingRange(sn, en);
            properties.forEach(function (p) {
                var p1 = p.clone();
                var p2 = p.clone();

                p1.guid = null; // a split property is really two new properties
                p1.endNode = sn.previousElementSibling;
                p1.endNode.endProperties = p1.endNode.endProperties || [];
                p1.endNode.endProperties.push(p1);

                p2.guid = null; // a split property is really two new properties
                p2.startNode = en.nextElementSibling;
                p2.startNode.startProperties = p2.startNode.startProperties || [];
                p2.startNode.startProperties.push(p2);

                p.remove();

                _this.data.properties.push(p1);
                _this.data.properties.push(p2);

                whileNext(p1.startNode, p1.endNode, function (span) {
                    _this.paint(span);
                });
                whileNext(p2.startNode, p2.endNode, function (span) {
                    _this.paint(span);
                });
            });
        };
        Editor.prototype.getPropertiesTraversingRange = function (startNode, endNode) {
            var traversing = [];
            var nodes = allNodesBetween(startNode, endNode);
            this.data.properties.forEach(function (prop) {
                nodes.forEach(function (node) {
                    if (isWithin(prop.startNode, prop.endNode, node)) {
                        if (traversing.indexOf(prop) < 0) {
                            traversing.push(prop);
                        }
                    }
                });
            });
            return traversing;
        };
        Editor.prototype.handleBackspace = function (current, updateCarot) {
            var _ = this;
            var previous = current.previousElementSibling;
            var next = current.nextElementSibling;
            var outOfStream = (current.speedy.stream == TEXT_STREAM.OUT);
            if (outOfStream) {
                current.startProperties[0].remove();
                current.style.display = "none";
                if (updateCarot && previous) {
                    this.setCarotByNode(previous);
                }
                return;
            }
            if (current) {
                if (current.startProperties.length) {
                    current.startProperties.each(function (prop) {
                        prop.startNode = next;
                        if (next) {
                            next.startProperties.push(prop);
                        }
                    });
                    current.startProperties.length = 0;
                }
                if (current.endProperties.length) {
                    current.endProperties.each(function (prop) {
                        prop.endNode = previous;
                        if (previous) {
                            previous.endProperties.push(prop);
                        }
                    });
                    current.endProperties.length = 0;
                }
            }
            if (previous) {
                if (previous.endProperties.length) {
                    previous.endProperties
                        .where(function (ep) { return ep.startNode == next && ep.endNode == previous; })
                        .each(function (single) { remove(_.data.properties, single); });
                }
            }
            current.remove();
            if (updateCarot && previous) {
                this.setCarotByNode(previous);
            }
        };
        Editor.prototype.handleDelete = function (current) {
            var next = current.nextElementSibling;
            var previous = current.previousElementSibling;
            var outOfStream = (current.speedy.stream == TEXT_STREAM.OUT);
            if (outOfStream) {
                next.startProperties[0].remove();
                next.style.display = "none";
                if (current) {
                    this.setCarotByNode(current);
                }
                return;
            }
            if (next.startProperties.length) {
                var forward = next.nextElementSibling;
                next.startProperties.each(function (prop) {
                    prop.startNode = forward;
                    forward.startProperties.push(prop);
                });
                next.startProperties.length = 0;
            }
            if (next.endProperties.length) {
                next.endProperties.each(function (prop) {
                    prop.endNode = current;
                    current.endProperties.push(prop);
                });
                next.endProperties.length = 0;
            }
            next.startProperties
                .where(function (sp) { return sp.endNode == current && sp.startNode == next; })
                .each(function (single) { remove(_.data.properties, single); });
            next.remove();
            this.setCarotByNode(current);
        };
        Editor.prototype.getCurrent = function () {
            var sel = window.getSelection();
            var current = sel.anchorNode.parentElement;
            if (sel.anchorOffset == 0) {
                current = current.previousElementSibling;
            }
            return current;
        };
        Editor.prototype.deleteRange = function (range) {
            var c = 0;
            var node = range.end;
            if (node != range.start) {
                while (node != range.start) {
                    var prev = node.previousElementSibling;
                    this.handleBackspace(node);
                    node = prev;
                    if (c++ > maxWhile) {
                        console.log("Exceeded max iterations", {
                            method: "deleteRange", node, range
                        });
                        return;
                    }
                }
            }
            this.handleBackspace(range.start, true);
        };
        Editor.prototype.getSelection = function () {
            var range = this.getSelectionNodes();
            if (!range) {
                return null;
            }
            var text = getRangeText(range);
            return {
                text: text,
                startIndex: nodeIndex(range.start),
                endIndex: nodeIndex(range.end)
            };
        };
        Editor.prototype.canDelete = function (node) {
            return true;
        };
        Editor.prototype.handleKeyDownEvent = function (evt) {
            var _ = this;
            var canEdit = !!!this.lockText;
            var canAnnotate = !!!this.lockProperties;
            var isFirst = !this.container.children.length;
            var current = this.getCurrent();
            var key = evt.which || evt.keyCode;
            var range = this.getSelectionNodes();
            var hasSelection = !!range;
            if (key == BACKSPACE || key == DELETE) {
                if (key == BACKSPACE) {
                    if (canEdit) {
                        if (hasSelection) {
                            this.deleteRange(range);
                        }
                        else {
                            this.handleBackspace(current, true);
                        }
                        this.updateCurrentRanges();
                    }
                    evt.preventDefault();
                    return;
                } else if (key == DELETE) {
                    if (canEdit) {
                        if (hasSelection) {
                            this.deleteRange(range);
                        }
                        else {
                            this.handleDelete(current);
                        }
                        this.updateCurrentRanges();
                    }
                    evt.preventDefault();
                    return;
                }
                else {
                    // not handled
                }
            }
            if (key >= LEFT_ARROW && key <= DOWN_ARROW) {
                this.updateCurrentRanges();
                return true;
            } else if (key == HOME || key == END) {
                this.updateCurrentRanges();
                return true;
            }
            else if (evt.ctrlKey || evt.metaKey) {
                if (canAnnotate) {
                    if (evt.key == "a" || evt.key == "Control" || evt.key == "Meta") {
                        return;
                    }
                    var propertyTypeName = this.getPropertyTypeNameFromShortcutKey(evt.key);
                    if (propertyTypeName) {
                        evt.preventDefault();
                        this.createProperty(propertyTypeName);
                    }
                }
                else {
                    evt.preventDefault();
                }
                return true;
            } else if (key == SHIFT || key == ALT) {
                this.updateCurrentRanges();
                return true;
            }

            //if (key != SPACE && (key <= DELETE || key == LEFT_WINDOW_KEY || key == RIGHT_WINDOW_KEY || (key >= F1 && key <= SCROLL_LOCK))) {
            //    evt.preventDefault();
            //    this.updateCurrentRanges();
            //    return;
            //}

            if (hasSelection) {
                if (range.start == range.end) {
                    range.start.textContent = evt.key;
                    evt.preventDefault();
                    this.paint(range.start);
                    this.updateCurrentRanges();
                    return;
                }
                else {
                    // Overwrite selected range by first deleting it.
                    current = range.start.previousElementSibling;
                    this.deleteRange(range);
                }
            }

            evt.preventDefault();

            if (false == canEdit) {
                return;
            }

            var span = this.newSpan();
            span.textContent = evt.key;
            this.handleSpecialChars(span, key);
            if (key == SPACE) {
                span.textContent = String.fromCharCode(160);
            }
            if (isFirst) {
                this.container.appendChild(span);
                this.setCarotByNode(span);
            }
            else {
                var atFirst = !current;
                var next = atFirst ? this.container.firstChild : current.nextElementSibling;
                if (next) {
                    var container = next.parentElement;
                    container.insertBefore(span, next);
                } else {
                    this.container.appendChild(span);
                    this.setCarotByNode(span);
                }
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            if (this.onCharacterAdded) {
                this.onCharacterAdded(span, this);
            }
            this.updateCurrentRanges();
        };
        Editor.prototype.getPreviousCharacterNode = function (span) {
            return span && span.previousElementSibling;
        };
        Editor.prototype.getNextCharacterNode = function (span) {
            return span && span.nextElementSibling;
        };
        Editor.prototype.getPropertyTypeNameFromShortcutKey = function (key) {
            for (var propertyTypeName in this.propertyType) {
                var propertyType = this.propertyType[propertyTypeName];
                if (propertyType.shortcut == key) {
                    return propertyTypeName;
                }
            }
            return null;
        };
        Editor.prototype.handleSpecialChars = function (span, charCode) {
            if (charCode == SPACE) {
                // span.textContent = String.fromCharCode(160);
                //span.style.width = "10px";
                //span.style.top = "5px";
                //span.style.display = "inline-block";
            }
            if (charCode == ENTER) {
                //span.speedy.role = ELEMENT_ROLE.CHAR;
                span.textContent = String.fromCharCode(13);
                span.classList.add("line-break");
            }
            if (charCode == TAB) {
                span.textContent = String.fromCharCode(TAB);
                span.classList.add("tab");
            }
        };
        Editor.prototype.setCarotByNode = function (node) {
            if (!node) {
                return;
            }
            var selection = window.getSelection();
            var range = document.createRange();
            range.setStart(node.firstChild, 1); // The first child in this case is the TEXT NODE of the span; must set it to this.
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        };
        Editor.prototype.getParentSpan = function (node) {
            var c = 0;
            while (false == (node instanceof HTMLSpanElement)) {
                node = this.getParentSpan(node.parentElement);
                if (c++ > maxWhile) {
                    console.log("Exceeded max iterations", {
                        method: "getParentSpan", node
                    });
                    return;
                }
            }
            return node;
        };
        Editor.prototype.getSelectionNodes = function () {
            var range = window.getSelection().getRangeAt(0);
            if (range.collapsed) {
                return null;
            }
            console.log({ range });
            var startContainer = range.startContainer;
            var endContainer = range.endContainer;
            if (range.startOffset == 1) {
                startContainer = range.startContainer.parentElement.nextElementSibling;
            }
            if (range.endOffset == 0) {
                endContainer = range.endContainer.previousElementSibling;
            }
            var startNode = getParent(startContainer, x => x.speedy && x.speedy.role == ELEMENT_ROLE.CHAR);
            var endNode = getParent(endContainer, x => x.speedy && x.speedy.role == ELEMENT_ROLE.CHAR);
            console.log({ startContainer, endContainer, startNode, endNode });
            return {
                start: startNode,
                end: endNode
            };
        };
        Editor.prototype.createSelection = function (sn, en) {
            var range = document.createRange();
            range.setStart(sn, 0);
            range.setEnd(en, 1);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        };
        Editor.prototype.addProperties = function (props) {
            var _this = this;
            each(props, function (prop) {
                _this.addProperty(prop);
            });
        };
        Editor.prototype.spanAtIndex = function (i) {
            return indexNode(this.container.firstChild, i);
            //var node = this.container.firstChild;
            //while (node != null && i > 0) {
            //    if (node.speedy.stream == TEXT_STREAM.IN) {
            //        i--;
            //    }
            //    node = node.nextElementSibling;
            //}
            //return node;
        };
        Editor.prototype.addProperty = function (p) {
            var propertyType = this.propertyType[p.type];
            var nodes = this.container.children;
            var sn = this.spanAtIndex(p.startIndex);
            var en = this.spanAtIndex(p.endIndex);
            var prop = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                value: p.value,
                type: p.type,
                startNode: sn,
                endNode: en,
                attributes: p.attributes
            });
            prop.text = p.text;
            sn.startProperties.push(prop);
            en.endProperties.push(prop);
            if (propertyType) {
                if (propertyType.bracket) {
                    if (propertyType.bracket.left) {
                        var left = this.createBracketNode(propertyType.bracket.left, sn.parentElement, sn);
                        prop.addLeftBracket(left);
                    }
                    if (propertyType.bracket.right) {
                        var right = this.createBracketNode(propertyType.bracket.right, en.parentElement, en.nextElementSibling);
                        prop.addRightBracket(right);
                    }
                }
            }
            prop.setSpanRange();
            this.data.properties.push(prop);
            if (this.onPropertyCreated) {
                this.onPropertyCreated(prop);
            }
        };
        Editor.prototype.addZeroPoint = function (type, content, position) {
            var span = this.newSpan(content);
            span.speedy.stream = TEXT_STREAM.OUT;
            var property = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                type: type,
                startNode: span,
                endNode: span,
                isZeroPoint: true
            });
            this.container.insertBefore(span, position.nextElementSibling);
            span.startProperties.push(property);
            span.endProperties.push(property);
            this.data.properties.push(property);
            property.setSpanRange();
            return property;
        };
        Editor.prototype.createZeroPointProperty = function (propertyTypeName, content) {
            var _this = this;
            var type = find(this.propertyType, function (__, key) { return key == propertyTypeName; });
            if (!type) {
                // No annotation type found.
                return;
            }
            content = content || type.content;
            var prop = this.addZeroPoint(propertyTypeName, content, this.getCurrent());
            if (type.propertyValueSelector) {
                type.propertyValueSelector(prop, function (value, name) {
                    if (value) {
                        prop.value = value;
                        prop.name = name;
                    }
                });
            }
        };
        Editor.prototype.createBlockProperty = function (propertyTypeName) {
            var selection = this.getSelectionNodes();
            this.createBlock(selection.start, selection.end, propertyTypeName);
            var property = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                type: propertyTypeName,
                startNode: selection.start,
                endNode: selection.end
            });
            this.data.properties.push(property);
        };
        Editor.prototype.createBlock = function (startNode, endNode, type) {
            var dummy = document.createElement("SPAN");
            this.container.insertBefore(dummy, startNode);
            var block = document.createElement("DIV");
            block.speedy = {
                role: ELEMENT_ROLE.BLOCK,
                stream: TEXT_STREAM.OUT
            };
            block.classList.add(this.propertyType[type].className);
            var nodes = allNodesBetween(startNode, endNode);
            nodes.forEach(node => block.appendChild(node));
            this.container.insertBefore(block, dummy);
            this.container.removeChild(dummy);
        };
        Editor.prototype.createProperty = function (propertyTypeName, value) {
            var _this = this;
            if (propertyTypeName == "erase") {
                this.erase();
                return;
            }
            var type = find(this.propertyType, function (__, key) { return key == propertyTypeName; });
            if (!type) {
                // No annotation type found.
                return;
            }
            if (type.format == "zero-point") {
                if (!type.propertyValueSelector) {
                    this.addZeroPoint(propertyTypeName, type.content, this.getCurrent());
                    return;
                }
            }
            var range = this.getSelectionNodes();
            var prop = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                type: propertyTypeName,
                startNode: range.start,
                endNode: range.end
            });
            if (type.bracket) {
                if (type.bracket.left) {
                    var left = this.createBracketNode(type.bracket.left, range.start.parentElement, range.start);
                    prop.addLeftBracket(left);
                }
                if (type.bracket.right) {
                    var right = this.createBracketNode(type.bracket.right, range.end.parentElement, range.end.nextElementSibling);
                    prop.addRightBracket(right);
                }
            }
            prop.text = getRangeText(range);
            if (value) {
                prop.value = value;
            }
            var process = function (p) {
                p.startNode.startProperties.push(p);
                p.endNode.endProperties.push(p);
                _this.data.properties.push(p);
                p.setSpanRange();
                if (_this.onPropertyCreated) {
                    _this.onPropertyCreated(p);
                }
            }
            if (type.propertyValueSelector) {
                type.propertyValueSelector(prop, function (value, name) {
                    if (value) {
                        prop.value = value;
                        prop.name = name;
                        process(prop);
                    }
                });
            }
            else {
                process(prop);
            }
        };
        Editor.prototype.paint = function (s) {
            var _ = this;
            window.setTimeout(function () {
                var properties = this.data.properties
                    .where(function (prop) { return !prop.isDeleted; })
                    .where(function (prop) { return isWithin(prop.startNode, prop.endNode, s); })
                    .sort(function (a, b) { return a.index > b.index ? 1 : a.index == b.index ? 0 : -1; });
                each(properties, function (prop) {
                    _.paintSpanWithProperty(s, prop);
                });
            }.bind(this), 1);
        };
        Editor.prototype.paintSpanWithProperty = function (s, prop) {
            var propertyType = prop.getPropertyType();
            if (propertyType.format == "decorate") {
                s.classList.add(propertyType.className);
            } else if (propertyType.format == "overlay") {
                var inner = document.createElement("SPAN");
                inner.speedy = {
                    role: ELEMENT_ROLE.OVERLAY,
                    stream: TEXT_STREAM.OUT
                };
                inner.setAttribute("data-layer", this.layer);
                inner.classList.add("overlaid");
                inner.classList.add(propertyType.className);
                s.appendChild(inner);
            }
            if (propertyType.styleRenderer) {
                propertyType.styleRenderer([s], prop);
            }
        };
        Editor.prototype.unbind = function () {
            var text = this.temp.text = markNodesWithIndexes(this.container.firstChild);
            var result = {
                text: text,
                properties: this.toPropertyNodes()
            };
            console.log({ unbind: result });
            return result;
        };
        Editor.prototype.unbindText = function () {
            return markNodesWithIndexes(this.container.firstChild);
        };
        Editor.prototype.toPropertyNodes = function () {
            var list = [];
            var props = this.data.properties;
            for (var i = 0; i < props.length; i++) {
                list.push(props[i].toNode());
            }
            return list;
        }
        Editor.prototype.bind = function (model) {
            var _this = this;
            if (typeof model == "string") {
                model = JSON.parse(model);
            }
            this.emptyContainer();
            this.populateContainer(model.text);
            this.data.text = model.text;
            if (!model.properties) {
                return;
            }
            this.data.properties = [];
            var len = this.data.text.length;
            console.log("Text length", len);
            var properties = model.properties.filter(item => !item.isZeroPoint)
                .sort((a, b) => a.index > b.index ? 1 : a.index < b.index ? -1 : 0);
            var propertiesLength = properties.length;
            for (var i = 0; i < propertiesLength; i++) {
                var p = properties[i];
                console.log("Property", p);
                var type = this.propertyType[p.type];
                if (!type) {
                    console.warn("Property type not found.", p);
                    //continue;
                }
                if (p.startIndex < 0) {
                    console.warn("StartIndex less than zero.", p);
                    continue;
                }
                if (p.endIndex > len - 1) {
                    console.warn("EndIndex out of bounds.", p);
                    continue;
                }
                var isMetadata = (p.startIndex == null && p.endIndex == null);
                var startNode = (isMetadata ? null : this.indexNode(p.startIndex));
                // var startNode = (isMetadata ? null : this.container.children[p.startIndex]);
                if (!isMetadata && startNode == null) {
                    console.warn("Start node not found.", p);
                    continue;
                }
                var endNode = (isMetadata ? null : this.indexNode(p.endIndex));
                // var endNode = (isMetadata ? null : this.container.children[p.endIndex]);
                if (!isMetadata && endNode == null) {
                    console.warn("End node not found.", p);
                    continue;
                }
                var prop = new Property({
                    editor: this,
                    layer: p.layer,
                    guid: p.guid,
                    index: p.index,
                    type: p.type,
                    value: p.value,
                    text: p.text,
                    attributes: p.attributes,
                    startNode: startNode,
                    endNode: endNode,
                    isDeleted: p.isDeleted
                });
                if (this.onPropertyCreated) {
                    this.onPropertyCreated(prop, p);
                }
                if (startNode) {
                    startNode.startProperties.push(prop);
                }
                if (endNode) {
                    endNode.endProperties.push(prop);
                }
                if (type) {
                    if (type.bracket) {
                        if (type.bracket.left) {
                            var left = this.createBracketNode(type.bracket.left, startNode.parentElement, startNode);
                            prop.addLeftBracket(left);
                        }
                        if (type.bracket.right) {
                            var right = this.createBracketNode(type.bracket.right, endNode.parentElement, endNode.nextElementSibling);
                            prop.addRightBracket(right);
                        }
                    }
                }
                prop.setSpanRange();
                this.data.properties.push(prop);
                propCounter = this.data.properties.length;
            }
            this.handleZeroLengthAnnotations(model);
            this.handleBlocks(properties);
        };
        Editor.prototype.createBracketNode = function (bracket, parent, next) {
            var bracketNode = this.newSpan(bracket.content);
            bracketNode.speedy.stream = TEXT_STREAM.OUT;
            if (bracket.className) {
                bracketNode.classList.add(bracket.className);
            }
            parent.insertBefore(bracketNode, next);
            return bracketNode;
        };
        Editor.prototype.handleBlocks = function (properties) {
            var _this = this;
            var blocks = properties.filter(item => !item.isDeleted && _this.propertyType[item.type] && _this.propertyType[item.type].format == "block")
                .sort((a, b) => a.startIndex > b.startIndex ? -1 : a.startIndex < b.startIndex ? 1 : 0);
            if (blocks.length) {
                // blocks.forEach(p => _this.createBlock(_this.container.children[p.startIndex], _this.container.children[p.endIndex], p.type));
                blocks.forEach(p => _this.createBlock(_this.indexNode(p.startIndex), _this.indexNode(p.endIndex), p.type));
            }
        };
        Editor.prototype.indexNode = function (index) {
            return indexNode(this.container.firstChild, index);
        };
        Editor.prototype.handleZeroLengthAnnotations = function (model) {
            var len = model.text.length;
            var zeroProperties = model.properties.filter(function (item) {
                return item.isZeroPoint;
            });
            // Work backwards through the list of zero properties so we don't fetch a SPAN that hasn't been offset from a previous insertion.
            zeroProperties = zeroProperties.sort((a, b) => a.startIndex > b.startIndex ? -1 : a.startIndex < b.startIndex ? 1 : 0);
            var zeroPropertiesLength = zeroProperties.length;
            console.log({ zeroProperties });
            for (var i = 0; i < zeroPropertiesLength; i++) {
                var p = zeroProperties[i];
                console.log("Zero-point property", p);
                var pt = this.propertyType[p.type];
                if (!pt) {
                    console.warn("Property type not found.", p);
                    continue;
                }
                if (p.startIndex < 0) {
                    console.warn("StartIndex less than zero.", p);
                    continue;
                }
                if (p.endIndex > len - 1) {
                    console.warn("EndIndex out of bounds.", p);
                    continue;
                }
                var node = this.indexNode(p.startIndex - 1);
                // var node = this.container.children[p.startIndex - 1];
                if (!node) {
                    console.warn("ZPA node not found.", p);
                    continue;
                }
                var prop = this.addZeroPoint(p.type, pt.content || p.text, node);
                prop.guid = p.guid;
                prop.layer = p.layer;
                prop.attributes = p.attributes;
                prop.index = p.index;
                prop.value = p.value;
                prop.isDeleted = p.isDeleted;
                prop.setSpanRange();
                if (prop.isDeleted) {
                    prop.startNode.style.display = "none";
                }
                if (this.onPropertyCreated) {
                    this.onPropertyCreated(prop, p);
                }
            }
        };
        Editor.prototype.emptyContainer = function () {
            this.container.textContent = "";
        };
        Editor.prototype.appendToContainer = function (spans) {
            var len = spans.length;
            for (var i = 0; i < len; i++) {
                this.container.appendChild(spans[i]);
            }
        };
        Editor.prototype.populateContainer = function (text) {
            var frag = this.textToDocumentFragment(text);
            this.container.appendChild(frag);
            if (this.onCharacterAdded) {
                var _this = this;
                var start = this.container.firstChild;
                var end = this.container.lastChild;
                whileNext(start, end, (span) => {
                    _this.onCharacterAdded(span, _this);
                });
            }
        };
        Editor.prototype.textToDocumentFragment = function (text) {
            var len = text.length, i = 0;
            var skip = [LINE_FEED];
            var frag = document.createDocumentFragment();
            while (len--) {
                var c = text[i++];
                var code = c.charCodeAt();
                if (skip.indexOf(code) >= 0) {
                    continue;
                }
                var span = this.newSpan(c);
                this.handleSpecialChars(span, code);
                frag.appendChild(span);
            }
            return frag;
        };
        Editor.prototype.newSpan = function (text) {
            var s = document.createElement("SPAN");
            s.speedy = {
                role: ELEMENT_ROLE.CHAR,
                stream: TEXT_STREAM.IN
            };
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text;
            }
            s.startProperties = [];
            s.endProperties = [];
            return s;
        };
        return Editor;
    })();

    return Editor;
}));