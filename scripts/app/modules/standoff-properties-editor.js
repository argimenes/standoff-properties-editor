(function (factory) {
    define("speedy/editor", ["app/utils"], factory);
}(function (utils) {

    const find = utils.find;
    var maxWhile = 10000000;

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

    const SELECTION_DIRECTION = {
        LEFT: 0,
        RIGHT: 1
    };

    const distinct = (list) => {
        var results = [];
        list.forEach((item) => {
            if (results.indexOf(item) == -1) {
                results.push(item);
            }
        });
        return results;
    };

    const BACKSPACE = 8,
        CAPSLOCK = 20, PAGE_UP = 33, PAGE_DOWN = 34,
        DELETE = 46, HOME = 36, END = 35, INSERT = 45, PRINT_SCREEN = 44, PAUSE = 19, SELECT_KEY = 93, NUM_LOCK = 144,
        LEFT_ARROW = 37, RIGHT_ARROW = 39, UP_ARROW = 38, DOWN_ARROW = 40, SPACE = 32, ESCAPE = 27,
        SHIFT = 16, CTRL = 17, ALT = 18, ENTER = 13, LINE_FEED = 10, TAB = 9, LEFT_WINDOW_KEY = 91, SCROLL_LOCK = 145,
        RIGHT_WINDOW_KEY = 92, F1 = 112, PROCESS = 229;

    const PASSTHROUGH_CHARS = [CTRL, PROCESS, CAPSLOCK, PAGE_UP, PAGE_DOWN, HOME, END, PRINT_SCREEN, PAUSE, SELECT_KEY, NUM_LOCK, SCROLL_LOCK, LEFT_WINDOW_KEY, RIGHT_WINDOW_KEY, UP_ARROW, DOWN_ARROW, SHIFT, ALT];

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
            //console.log({ c, s });
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
        if (!node) {
            return null;
        }
        var i = 0;
        var c = 0;
        var text = "";
        var loop = true;
        node = (node && node.speedy ? node : getParent(node, n => n.speedy));
        if (isBlock(node)) {
            node = node.firstChild;
        }
        while (loop && node) {
            if (isOutOfTextStream(node)) {
                node.speedy.index = i;
                node = node.nextElementSibling
                continue;
            }
            if (node.speedy) {
                text += getTextContent(node);
                node.speedy.index = i++;
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
        if (!node.speedy) {
            return node;
        }
        while (loop) {
            var previous = node.previousElementSibling;
            if (!previous) {
                if (node.speedy.role == ELEMENT_ROLE.BLOCK) {
                    node = node.lastChild;
                }
                else {
                    var parent = node.parentElement;
                    if (!parent.speedy) {
                        return node;
                    }
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
                //console.log({ m: "nextUntil", branch: 0, node, next });
                var parent = node.parentElement;
                if (parent.speedy && parent.speedy.role == ELEMENT_ROLE.BLOCK) {
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
            return node.speedy.role == ELEMENT_ROLE.CHAR && node.speedy.stream == TEXT_STREAM.IN && !node.speedy.isLineBreak;
        });
        return char;
    }

    function firstPreviousCharOrLineBreak(start) {
        if (!start || !start.speedy) {
            return start;
        }
        var char = previousUntil(start, node => {
            return node.speedy.role == ELEMENT_ROLE.CHAR && node.speedy.stream == TEXT_STREAM.IN;
        });
        return char;
    }

    function firstNextChar(start) {
        //console.log({ m: "firstNextChar", start });
        var char = nextUntil(start, node => {
            //console.log({ m: "firstNextChar", node });
            return node.speedy.role == ELEMENT_ROLE.CHAR && node.speedy.stream == TEXT_STREAM.IN && !node.speedy.isLineBreak;
        });
        return char;
    }

    function firstNextCharOrLineBreak(start) {
        if (!start || !start.speedy) {
            return start;
        }
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
            if (false == isInTextStream(node)) {
                node = node.previousElementSibling;
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
            if (maxWhile && c++ > maxWhile) {
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
            return true;
        }
        return false;
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
            this.schema = cons.schema;
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
        Property.prototype.hideZeroWidth = function () {
            this.startNode.style.display = "none";
        };
        Property.prototype.showZeroWidth = function () {
            this.startNode.style.display = "inline";
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
        Property.prototype.scrollTo = function () {
            this.startNode.scrollIntoView();
        };
        Property.prototype.highlight = function (style) {
            var _this = this;
            if (this.isZeroPoint) {
                return;
            }
            if (style) {
                this.overRange(s => s.style.backgroundColor = style);
                return;
            }
            var css = this.editor.css.highlight || "text-highlight";
            this.overRange(s => s.classList.add(css));
        };
        Property.prototype.unhighlight = function (style) {
            if (this.isZeroPoint) {
                return;
            }
            if (style) {
                this.overRange(s => s.style.backgroundColor = style);
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
            // var previous = node.previousElementSibling;
            var previous = firstPreviousChar(node);
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
            // var nextOneOver = node.nextElementSibling.nextElementSibling;
            var nextOneOver = firstNextChar(firstNextChar(node));
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
        Property.prototype.shiftLeft = function (suppressFlash) {
            this.unsetSpanRange();
            var previousStartNode = this.getPreviousCharNode(this.startNode);
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.shiftStartProperties(this.startNode, previousStartNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
            this.startNode = previousStartNode;
            this.endNode = previousEndNode;
            this.shiftBracketsLeft();
            this.setSpanRange();
            if (!suppressFlash) {
                this.flashHighlight();
            }
        };
        Property.prototype.flashHighlight = function () {
            var _this = this;
            this.highlight();
            setTimeout(() => _this.unhighlight(), 125);
        };
        Property.prototype.switchTo = function (start, end) {
            this.unsetSpanRange();
            this.startNode = start;
            this.endNode = end;
            this.setSpanRange();
        };
        Property.prototype.shiftRight = function (suppressFlash) {
            this.unsetSpanRange();
            var nextStartNode = this.getNextCharNode(this.startNode);
            var nextEndNode = this.getNextCharNode(this.endNode);
            this.shiftStartProperties(this.startNode, nextStartNode);
            this.shiftEndProperties(this.endNode, nextEndNode);
            this.startNode = nextStartNode;
            this.endNode = nextEndNode;
            this.shiftBracketsRight();
            this.setSpanRange();
            if (!suppressFlash) {
                this.flashHighlight();
            }
        };
        Property.prototype.expand = function () {
            this.unsetSpanRange();
            var nextEndNode = this.getNextCharNode(this.endNode);
            this.shiftEndProperties(this.endNode, nextEndNode);
            this.endNode = nextEndNode;
            this.shiftNodeRight(this.bracket.right);
            this.setSpanRange();
            this.flashHighlight();
        };
        Property.prototype.contract = function () {
            this.unsetSpanRange();
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
            this.endNode = previousEndNode;
            this.shiftNodeLeft(this.bracket.right);
            this.setSpanRange();
            this.flashHighlight();
        };
        Property.prototype.getPropertyType = function () {
            var _ = this;
            return find(this.editor.propertyType, function (item, key) {
                return key == _.type;
            });
        };
        Property.prototype.allInStreamNodes = function () {
            return allNodesBetween(this.startNode, this.endNode);
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
                if (!_this.isZeroPoint) {
                    if (s.speedy.role != ELEMENT_ROLE.CHAR || s.speedy.stream != TEXT_STREAM.IN) {
                        return;
                    }
                }
                var className = _this.className || (_this.isZeroPoint ? propertyType.zeroPoint.className : propertyType.className);
                if (format == "decorate" || _this.isZeroPoint) {
                    s.classList.add(className);
                } else if (format == "overlay" && !_this.isZeroPoint) {
                    if (s.classList.contains("line-break")) {
                        return;
                    }
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
            if (this.schema) {
                if (this.schema.onRequestAnimationFrame) {
                    this.schema.onRequestAnimationFrame(this);
                }
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
        Property.prototype.select = function () {
            this.editor.createSelection(this.startNode, this.endNode);
        };
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
            if (this.schema.animation) {
                if (this.schema.animation.delete) {
                    this.schema.animation.delete(this);
                }
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
                var zp = this.schema.zeroPoint;
                if (typeof zp.exportText == "undefined" || !!zp.exportText) {
                    text = this.startNode.textContent;
                }
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
            var event = cons.event || {};
            this.container = (cons.container instanceof HTMLElement) ? cons.container : document.getElementById(cons.container);
            if (cons.direction == "RTL") {
                this.container.style.direction = "RTL";
            }
            this.monitors = [];
            this.selectors = [];
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
            this.event = {
                keyboard: event.keyboard,
                contextMenuActivated: event.contextMenuActivated,
                contextMenuDeactivated: event.contextMenuDeactivated,
            };
            this.keyDownFilter = cons.keyDownFilter ||
              function(key) {
                // see http://cherrytree.at/misc/vk.htm
                if(
                  key === BACKSPACE ||
                  key === ENTER ||
                  key === ESCAPE ||
                  key === SPACE ||
                  key === DELETE ||
                  (key >= 48 && key <= 90) || // alphanumeric
                  (key >= 95 && key <= 111) || // numeric keypad and math functions
                  (key >= 186 && key <= 222) // OEM windows specific
                ) {
                  // process the key down event
                  return true;
                } else {
                  // ignore the event
                  return false;
                }
              };
            this.handleSpecialChars = cons.handleSpecialChars ||
              function (span, charCode) {
                if (charCode == ENTER) {
                    //span.speedy.role = ELEMENT_ROLE.CHAR;
                    span.textContent = String.fromCharCode(13);
                    span.classList.add("line-break");
                    span.speedy.isLineBreak = true;
                }
                if (charCode == TAB) {
                    span.textContent = String.fromCharCode(TAB);
                    span.classList.add("tab");
                }
              };
            this.unbinding = cons.unbinding || {};
            this.lockText = cons.lockText || false;
            this.lockProperties = cons.lockProperties || false;
            this.css = cons.css || {};
            this.marked = false;
            this.characterCount = 0;
            this.data = {
                text: null,
                properties: []
            };
            this.publisher = {
                layerAdded: []
            };
            this.subscriber = null;
            this.history = {
                cursor: []
            };
            this.mode = {
                selection: {
                    direction: null,
                    start: null,
                    end: null
                },
                contextMenu: {
                    active: false
                }
            };
            this.propertyType = cons.propertyType;
            this.commentManager = cons.commentManager;
            this.setupEventHandlers();
        };
        Editor.prototype.synchronise = function (container) {
            var data = this.unbind();
            var editor = new Editor({
                container: container,
                propertyType: this.propertyType
            });
            this.monitors.forEach(m => editor.addMonitor(m));
            editor.bind(data);
            this.subscriber = editor;
            editor.subscriber = this;
        };
        Editor.prototype.clearMonitors = function () {
            this.monitors.forEach(x => x.clear());
        };
        Editor.prototype.shiftPropertiesLeftFromNode = function (node) {
            var i = nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftLeft());
        };
        Editor.prototype.shiftPropertiesRightFromNode = function (node) {
            var i = nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftRight());
        };
        Editor.prototype.shiftPropertiesLeftFromCaret = function (node) {
            var node = this.getCurrent();
            this.shiftPropertiesLeftFromNode(node);
        };
        Editor.prototype.shiftPropertiesRightFromCaret = function (node) {
            var node = this.getCurrent();
            this.shiftPropertiesRightFromNode(node);
        };
        Editor.prototype.setLayerVisibility = function (layer, show) {
            this.data.properties
                .filter(function (prop) { return prop.layer == layer; })
                .forEach(function (prop) {
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
            this.publisher.layerAdded.forEach(function (handler) {
                try {
                    handler(e);
                }
                catch (ex) {
                    console.log(ex);
                }
            });
        };
        Editor.prototype.setupEventHandlers = function () {
            var _this = this;
            this.container.addEventListener("dblclick", this.handleDoubleClickEvent.bind(this));
            this.container.addEventListener("keydown", this.handleKeyDownEvent.bind(this));
            this.container.addEventListener("mouseup", this.handleMouseUpEvent.bind(this));
            this.container.addEventListener("paste", this.handleOnPasteEvent.bind(this));
            if(this.event.contextMenuActivated && this.event.contextMenuDeactivated) {
              this.container.addEventListener("contextmenu", e => {
                e.preventDefault();
                const origin = {
                  left: e.pageX,
                  top: e.pageY
                };
                var range = this.getSelectionNodes();
                _this.event.contextMenuActivated({ editor: _this, e, range });
                return false;
              });
              window.addEventListener("click", e => {
                if (_this.mode.contextMenu.active) {
                  _this.event.contextMenuDeactivated({ editor: _this, e });
                }
              });
            }
        };
        Editor.prototype.setAnimationFrame = function () {
            var _this = this;
            window.requestAnimationFrame(function () {
                var properties = _this.data.properties.filter(p => !!_this.propertyType[p.type].onRequestAnimationFrame);
                if (!properties.length) {
                    return;
                }
                //console.log({ method: "requestAnimationFrame", properties })
                properties.forEach(p => _this.propertyType[p.type].onRequestAnimationFrame(p, _this.propertyType[p.type], _this));
            });
        };
        Editor.prototype.getPropertyAtCursor = function () {
            var _this = this;
            var node = this.getCurrent();
            var enclosing = this.data.properties.filter(function (prop) {
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
        Editor.prototype.nodeAtIndex = function (index) {
            return indexNode(this.container.firstChild, index);
        };
        Editor.prototype.handleDoubleClickEvent = function (e) {
            var _this = this;
            var props = this.data.properties.filter(function (prop) {
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
        Editor.prototype.addSelector = function (selector) {
            this.selectors.push(selector);
        };
        Editor.prototype.getCurrentRanges = function (span) {
            if (!span || !span.speedy) {
                return [];
            }
            var i = span.speedy.index;
            if (typeof i == "undefined") {
                i = nodeIndex(span);
            }
            var props = this.data.properties.filter(function (prop) {
                if (prop.isDeleted || !prop.startNode || !prop.endNode || !span.speedy) {
                    return false;
                }
                const si = prop.startIndex();
                const ei = prop.endIndex();
                return si <= i && i <= ei;
            });
            return props;
        };
        Editor.prototype.getPropertiesWithin = function (start, end) {
            if (!start || !start.speedy || !end || !end.speedy) {
                return [];
            }
            var props = this.data.properties.filter(function (prop) {
                if (prop.isDeleted || !prop.startNode || !prop.endNode) {
                    return false;
                }
                const s = prop.startIndex();
                const e = prop.endIndex();
                const a = start.speedy.index;
                const b = end.speedy.index;
                //return s <= a && b <= e;
                return s <= b && a <= e;
            });
            return props;
        };
        Editor.prototype.updateCurrentRanges = function (span) {
            var _this = this;
            if (!span) {
                span = _this.getCurrent();
            }
            if (!_this.marked) {
                markNodesWithIndexes(_this.container.firstChild);
                _this.data.properties.sort((a, b) => a.startIndex() > b.endIndex() ? 1 : a.startIndex() == b.startIndex() ? -1 : 0);
                _this.marked = true;
            }
            var props = this.getCurrentRanges(span);
            props.sort((a, b) => {
                const asi = a.startIndex();
                const bsi = b.startIndex();
                if (asi > bsi) return 1;
                if (asi < bsi) return -1;
                const aei = a.endIndex();
                const bei = b.endIndex();
                if (aei > bei) return 1;
                if (aei < bei) return -1;
                return 0;
            });
            _this.setMonitor(props || []);
        };
        Editor.prototype.deleteAnnotation = function (type) {
            var current = this.getCurrent();
            var enclosing = this.data.properties.filter(function (prop) {
                return !prop.isDeleted && prop.type == type && isWithin(prop.startNode, prop.endNode, current);
            });
            if (enclosing.length != 1) {
                return;
            }
            enclosing[0].remove();
        };
        Editor.prototype.setMonitor = function (props) {
            var _this = this;
            _this.monitors.forEach(x => x.update({ properties: props, characterCount: _this.characterCount, editor: _this }));
        };
        Editor.prototype.handleMouseClickEvent = function (evt) {
            this.updateCurrentRanges();
        };
        Editor.prototype.updateSelectors = function () {
            var selection = this.getSelectionNodes();
            if (selection) {
                this.mode.selection.start = selection.start;
                this.mode.selection.end = selection.end;
                var properties = this.getPropertiesWithin(selection.start, selection.end);
                //console.log({ evt, selection, properties });
                if (this.selectors) {
                    this.selectors.forEach(s => s({ editor: this, properties, selection }));
                }
            } else {
                this.mode.selection.start = null;
                this.mode.selection.end = null;
                if (this.selectors) {
                    this.selectors.forEach(s => s({ editor: this, selection }));
                }
            }
        };
        Editor.prototype.handleMouseUpEvent = function (evt) {
            if (!evt.target.speedy || evt.target.speedy.role != ELEMENT_ROLE.CHAR) {
                return;
            }
            this.updateCurrentRanges(evt.target);
            this.updateSelectors();
            var props = this.getCurrentRanges(evt.target);
            if (props) {
                props.forEach(p => {
                    if (p.schema.event && p.schema.event.property) {
                        var property = p.schema.event.property;
                        if (property.mouseUp) {
                            property.mouseUp(p);
                        }
                    }
                });
            }
            this.addCursorToHistory(evt.target);
            //if (this.onContextMenuActivated) {
            //    var range = this.getSelectionNodes();
            //    this.onContextMenuActivated({ editor: this, e: evt, range });
            //}
        };
        Editor.prototype.addCursorToHistory = function (span) {
            this.history.cursor.push(span);
            if (this.history.cursor.length >= 10) {
                this.history.cursor.shift();
            }
            this.history.cursorIndex = this.history.cursor.length;
        };
        Editor.prototype.backCursor = function () {
            this.history.cursorIndex--;
            if (this.history.cursorIndex <= 0) {
                return;
            }
            this.moveCursorTo(this.history.cursor[this.history.cursorIndex]);
            //console.log(this.history.cursor[this.history.cursorIndex]);
        };
        Editor.prototype.forwardCursor = function () {
            this.history.cursorIndex++;
            if (this.history.cursorIndex > this.history.cursor.length) {
                return;
            }
            this.moveCursorTo(this.history.cursor[this.history.cursorIndex]);
            //console.log(this.history.cursor[this.history.cursorIndex]);
        };
        Editor.prototype.moveCursorTo = function (span) {
            span.scrollIntoView();
            this.setCarotByNode(span);
        };
        // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
        Editor.prototype.handleOnPasteEvent = function (e) {
            var caretSpan = this.getCurrent();
            var _this = this;
            e.stopPropagation();
            e.preventDefault();
            var clipboardData = e.clipboardData || window.clipboardData;
            var text = clipboardData.getData('text');
            var len = text.length;
            var frag = this.textToDocumentFragment(text);
            var lastInsertedSpan = frag.lastChild;
            if (this.container.children.length) {
                this.container.insertBefore(frag, caretSpan.nextElementSibling);
            } else {
                this.container.appendChild(frag);
            }
            if (this.onCharacterAdded) {
                var start = caretSpan;
                var end = caretSpan;
                while (len--) {
                    end = this.getNextCharacterNode(end);
                }
                whileNext(start, end, (span) => {
                    _this.onCharacterAdded(span, _this);
                });
            }
            this.marked = false;
            this.setCarotByNode(lastInsertedSpan);
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
                var next = atFirst ? this.container.firstChild : this.getNextCharacterNode(current);
                this.container.insertBefore(span, next);
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            this.marked = false;
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
            this.marked = false;
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
            var previous = firstPreviousCharOrLineBreak(current);
            var next = firstNextCharOrLineBreak(current); // this.getNextCharacterNode(current);
            //console.log({ current, previous, next });
            if (!previous) {
                return;
            }
            if(current) {
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
                      current.startProperties.forEach(function (prop) {
                          prop.startNode = next;
                          if (next) {
                              next.startProperties.push(prop);
                          }
                      });
                      current.startProperties.length = 0;
                  }
                  if (current !== previous && current.endProperties.length) {
                      current.endProperties.forEach(function (prop) {
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
                          .filter(function (ep) { return ep.startNode == next && ep.endNode == previous; })
                          .forEach(function (single) {
                              const removed = remove(_.data.properties, single);
                              if(removed && single.editor.onPropertyDeleted) {
                                  single.isDeleted = true;
                                  single.editor.onPropertyDeleted(single);
                              }
                            });
                  }
              }
              current.remove();
              //var leftOfPrevious = firstPreviousCharOrLineBreak(previous);
              //if (previous) {
              //    previous.remove();
              //}
            }
            if (updateCarot) {
                if (previous) {
                    this.setCarotByNode(previous);
                }
            }
        };

        Editor.prototype.getCurrent = function () {
            var sel = window.getSelection();
            var current = sel.anchorNode.parentElement;
            if (sel.anchorOffset == 0 && current.previousElementSibling) {
                current = current.previousElementSibling;
            }
            return current;
        };

        Editor.prototype.getCurrentNEW = function () {
            var sel = window.getSelection();
            if(this.container.children.length === 0) {
              return null;
            }
            var current = sel.anchorNode === this.container ? this.container.firstChild : this.getParentSpan(sel.anchorNode);
            if (sel.anchorOffset == 0 && !current.previousElementSibling) {
              return null;
            }
            if (sel.anchorOffset == 0 && current.previousElementSibling)  {
                current = current.previousElementSibling;
            }
            return current;
        };

        Editor.prototype.getNextNEW = function () {
            var sel = window.getSelection();
            if(this.container.children.length === 0) {
              return null;
            }
            var current = sel.anchorNode === this.container ? this.container.firstChild : this.getParentSpan(sel.anchorNode);

            if (sel.anchorOffset == 1 && !current.nextElementSibling) {
              return null;
            }
            if (sel.anchorOffset == 1 && current.nextElementSibling)  {
                current = current.nextElementSibling;
            }

            return current;
        };

        Editor.prototype.getCurrentTEST = function () {
            var sel = window.getSelection();
            // var current = sel.anchorNode.parentElement;
            if(this.container.children.length === 0) {
              return { node: null };
            }

            var current = this.getParentSpan(sel.anchorNode);
            if (sel.anchorOffset == 0 && !current.previousElementSibling) {
              return { node: null };
            }
            if (sel.anchorOffset == 0 && current.previousElementSibling)  {
                current = current.previousElementSibling;
            }
            return {
                node: current
            };
        };

        Editor.prototype.deleteRange = function (range) {
            var c = 0;
            var node = range.end;
            if (node != range.start) {
                while (node != range.start) {
                    var prev = this.getPreviousCharacterNode(node);
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
        Editor.prototype.clearSelectionMode = function () {
            this.mode.selection.start = null;
            this.mode.selection.end = null;
        };
        Editor.prototype.rightSelection = function (evt, current) {
            if (this.mode.selection.direction == null) {
                this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                if (!this.mode.selection.start) {
                    this.mode.selection.start = current;
                }
                if (!this.mode.selection.end) {

                    var next = this.getNextCharacterNode(current);
                    this.mode.selection.end = next;
                }
                else {
                    var next = this.getNextCharacterNode(this.mode.selection.end);
                    this.mode.selection.end = next;
                }
            } else if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                var node = this.mode.selection.start;
                var next = this.getNextCharacterNode(node);
                if (next == this.mode.selection.end) {
                    this.mode.selection.start = this.getNextCharacterNode(next);
                    this.mode.selection.end = next;
                    this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
                }
                if (nodeIndex(next) > nodeIndex(this.mode.selection.end)) {
                    var end = this.mode.selection.end;
                    this.mode.selection.end = next;
                    this.mode.selection.start = end;
                } else {
                    this.mode.selection.start = next;
                }
            }
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            this.updateSelectors();
        };
        Editor.prototype.leftSelection = function (evt, current) {
            if (this.mode.selection.direction == null) {
                this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                if (!this.mode.selection.end) {
                    this.mode.selection.end = current;
                }
                if (!this.mode.selection.start) {
                    var previous = this.getPreviousCharacterNode(current);
                    this.mode.selection.start = previous;
                }
                else {
                    var previous = this.getPreviousCharacterNode(this.mode.selection.start);
                    this.mode.selection.start = previous;
                }
            }
            else if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                var node = this.mode.selection.end;
                var previous = this.getPreviousCharacterNode(node);
                if (previous == this.mode.selection.start) {
                    this.mode.selection.start = this.getPreviousCharacterNode(previous);
                    this.mode.selection.end = previous;
                    this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
                }
                if (nodeIndex(previous) < nodeIndex(this.mode.selection.start)) {
                    var start = this.mode.selection.start;
                    this.mode.selection.start = previous;
                    this.mode.selection.end = start;
                } else {
                    this.mode.selection.end = previous;
                }
            }
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            this.updateSelectors();
        };
        Editor.prototype.processDelete = function (data) {
            var canEdit = !!!this.lockText;
            var hasSelection = !!data.range;
            var sub = this.subscriber;
            var range = data.range;
            var current = data.current;
            var next = data.next;

            var _range = null;
            var _current = null;
            var _next = null;
            if (sub) {
                if (range) {
                    _range = {
                        start: indexNode(sub.container.firstChild, nodeIndex(range.start)),
                        end: indexNode(sub.container.firstChild, nodeIndex(range.end))
                    };
                }
                _current = indexNode(sub.container.firstChild, nodeIndex(current));
                _next = indexNode(sub.container.firstChild, nodeIndex(next));
            }
            if (data.key == BACKSPACE) {
                if (canEdit) {
                    if (hasSelection) {
                        this.deleteRange(range);
                        if (sub) {
                            this.deleteRange(_range);
                        }
                    }
                    else {
                        this.handleBackspace(current, true);
                        if (sub) {
                            this.handleBackspace(_current);
                        }
                    }
                    this.marked = false;
                    this.updateCurrentRanges();
                }
            } else if (data.key == DELETE) {
                if (canEdit) {
                    if (hasSelection) {
                        this.deleteRange(range);
                        if (sub) {
                            this.deleteRange(_range);
                        }
                    }
                    else if(next !== current) {
                      this.handleBackspace(next, true);
                      if (sub) {
                          this.handleBackspace(_next);
                      }
                    }
                    this.marked = false;
                    this.updateCurrentRanges();
                }
                this.setAnimationFrame();
            }
        };

        Editor.prototype.processControlOrMeta = function (data) {
            var canAnnotate = !!!this.lockProperties;
            var propsAtCaret = this.getCurrentRanges(data.current);
            var props = propsAtCaret.filter(x => x.schema.event && x.schema.event.keyboard);
            var control = data.event.ctrlKey, shift = data.event.shiftKey;
            var processed = false;
            if (control && false == shift) {
                props.forEach(cp => {
                    let keyboard = cp.schema.event.keyboard;
                    let handlerName = "control-" + data.event.key.toUpperCase();
                    if (keyboard[handlerName]) {
                        keyboard[handlerName](cp);
                        processed = true;
                    }
                });
                let keyboard = this.event.keyboard;
                if (keyboard) {
                    let handlerName = "control-" + data.event.key.toUpperCase();
                    if (keyboard[handlerName]) {
                        keyboard[handlerName]({ properties: propsAtCaret });
                        processed = true;
                    }
                }
            }
            if (control && shift) {
                props.forEach(cp => {
                    let keyboard = cp.schema.event.keyboard;
                    let handlerName = "control-shift-" + data.event.key.toUpperCase();
                    if (keyboard[handlerName]) {
                        keyboard[handlerName](cp);
                        processed = true;
                    }
                });
                let keyboard = this.event.keyboard;
                if (keyboard) {
                    let handlerName = "control-shift-" + data.event.key.toUpperCase();
                    if (keyboard[handlerName]) {
                        keyboard[handlerName]({ properties: propsAtCaret });
                        processed = true;
                    }
                }
            }
            if (data.event.keyCode == ESCAPE) {
                props.forEach(cp => {
                    var keyboard = cp.schema.event.keyboard;
                    if (keyboard["esc"]) {
                        keyboard["esc"](cp);
                        processed = true;
                    }
                });
            }
            if (canAnnotate) {
                if (data.event.key == "Control" || data.event.key == "Meta") {
                    return processed;
                }
                var propertyTypeName = this.getPropertyTypeNameFromShortcutKey(data.event.key);
                if (propertyTypeName) {
                    data.event.preventDefault();
                    this.createProperty(propertyTypeName);
                    processed = true;
                }
            }
            return processed;
        };
        Editor.prototype.processSelectionOverwrite = function (data) {
            this.marked = false;
            var start = data.range.start;
            var end = data.range.end;
            var sub = this.subscriber;
            var _start = null;
            var _end = null;
            if (sub) {
                var si = nodeIndex(start);
                var ei = nodeIndex(end);
                _start = indexNode(sub.container.firstChild, si);
                _end = indexNode(sub.container.firstChild, ei);
            }
            if (start == data.range.end) {
                start.textContent = data.event.key;
                data.event.preventDefault();
                this.paint(start);
                if (sub) {
                    _start.textContent = data.event.key;
                    this.paint(_start);
                }
                return;
            }
            else {
                // Overwrite selected range by first deleting it.
                data.current = this.getPreviousCharacterNode(start);
                this.deleteRange(data.range);
                if (sub) {
                    this.deleteRange({ start: _start, end: _end });
                }
            }
        };
        Editor.prototype.handleKeyDownEvent = function (evt) {
            var _ = this;
            var canEdit = !!!this.lockText;

            var current = this.getCurrentNEW();                 // get the SPAN before the cursor
            var next = this.getNextNEW();                       // get the SPAN after the cursor
            var key = (evt.which || evt.keyCode);               // get the inputted key
            var range = this.getSelectionNodes();               // get the mouse selection range, if any
            var hasSelection = !!range;

            if( !this.keyDownFilter(key) ) {
              this.updateCurrentRanges();
              return true;
            }

            if (evt.ctrlKey || evt.metaKey || evt.keyCode == ESCAPE) {
                var processed = this.processControlOrMeta({ event: evt, current });
                if (processed) {
                    evt.preventDefault();
                }
                return;
            }
            if (false == canEdit) {
                evt.preventDefault();
                return;
            }
            if (key == BACKSPACE || key == DELETE) {
                this.processDelete({ key, current, next, range });
                this.setAnimationFrame();
                evt.preventDefault();
                return;
            }
            if (hasSelection) {
                this.processSelectionOverwrite({ event: evt, current, range });
            }
            evt.preventDefault();
            this.insertCharacter({ event: evt, key, current });
        };
        Editor.prototype.createSpan = function (data) {
            var span = this.newSpan();
            span.textContent = data.event.key;
            this.handleSpecialChars(span, data.key);
            if (data.key == SPACE) {
                span.textContent = String.fromCharCode(160);
            }
            return span;
        };
        Editor.prototype.insertCharacter = function (data) {
            var isFirst = !this.container.children.length;
            var span = this.createSpan(data);
            var sub = this.subscriber
            var _span = null;
            if (sub) {
                _span = sub.createSpan(data);
            }
            if (isFirst) {
                this.container.appendChild(span);
                this.setCarotByNode(span);
                if (sub) {
                    sub.container.appendChild(_span);
                    sub.setCarotByNode(_span);
                }
            }
            else {
                var atFirst = !data.current;
                var next = atFirst ? this.container.firstChild : this.getNextCharacterNode(data.current);
                var ni = nodeIndex(next);
                if (!atFirst) {
                    var index = data.current ? nodeIndex(data.current) : nodeIndex(this.getPreviousCharacterNode(data.current));
                    this.paint(span, index);
                    if (sub) {
                        sub.paint(_span, index);
                    }
                }
                if (next) {
                    if (next == data.current) {
                        this.container.appendChild(span);
                        if (sub) {
                            sub.container.appendChild(_span);
                        }
                    }
                    else {
                        var container = this.getContainer(next);
                        container.insertBefore(span, next);
                        if (sub) {
                            var _next = indexNode(sub.container.firstChild, ni);
                            var _container = this.getContainer(_next);
                            _container.insertBefore(_span, _next);
                        }
                    }
                    this.setCarotByNode(atFirst ? data.current : span);
                } else {
                    this.container.appendChild(span);
                    if (sub) {
                        sub.container.appendChild(_span);
                    }
                    this.setCarotByNode(span);
                }
            }
            if (this.onCharacterAdded) {
                this.onCharacterAdded(span, this);
                if (sub && sub.onCharacterAdded) {
                    sub.onCharacterAdded(_span, sub);
                }
            }
            this.marked = false;
            this.updateCurrentRanges();
            this.setAnimationFrame();
        };
        Editor.prototype.getContainer = function (span) {
            return span.parentElement;
        };
        Editor.prototype.getPreviousCharacterNode = function (span) {
            // return span && span.previousElementSibling;
            return span && firstPreviousChar(span);
        };
        Editor.prototype.getNextCharacterNode = function (span) {
            // return span && span.nextElementSibling;
            return span && firstNextChar(span);
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

        Editor.prototype.createSelection = function (start, end) {
            var selection = document.getSelection();
            var range = document.createRange();
            range.setStart(this.getTextNode(start), 1);
            range.setEnd(this.getTextNode(end), 1)
            if (selection.setBaseAndExtent) {
                var startOffset = 1;    // range.startOffset;
                var endOffset = 1;      // range.endOffset;
                selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
            } else {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };
        Editor.prototype.setCarotByNode = function (node) {
            let offset = 0;
            if (!node) {
                return;
            }
            if(node.nextElementSibling) {
              node = node.nextElementSibling;
            } else {
              offset = 1;
            }
            var selection = document.getSelection();
            var range = document.createRange();
            var textNode = this.getTextNode(node);
            range.setStart(textNode, offset);
            range.collapse(true);
            // console.log('setCarotByNode:', { node, range });
            if (selection.setBaseAndExtent) {
                var startOffset = offset;    // range.startOffset;
                var endOffset = offset;      // range.endOffset;
                selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
            } else {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };
        //
        // Get the first TEXT NODE of the element
        //
        Editor.prototype.getTextNode = function (element) {
            var node = element.firstChild;
            while (node.nodeType != 3) {
                node = node.firstChild;
            }
            return node;
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
            const selection = window.getSelection();
            if(selection.rangeCount === 0) {
                return null;
            }

            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                return null;
            }

            // check if selection is completely inside speedy
            const speedy = getParent(range.commonAncestorContainer, x => x === this.container);
            if(speedy === null) {
              return null;
            }

            let startNode = getParent(range.startContainer, x => x && x.speedy && x.speedy.role == ELEMENT_ROLE.CHAR);
            let endNode = getParent(range.endContainer, x => x && x.speedy && x.speedy.role == ELEMENT_ROLE.CHAR);

            if(!startNode || !endNode) {
              return null;
            }

            if(range.startOffset === 1) {
              startNode = startNode.nextElementSibling;
            }
            if(range.endOffset === 0) {
              endNode = endNode.previousElementSibling;
            }

            //console.log({ range, startContainer, endContainer });
            //console.log({ startContainer, endContainer, startNode, endNode });
            return {
                start: startNode,
                end: endNode
            };
        };
        //Editor.prototype.createSelection = function (sn, en) {
        //    var range = document.createRange();
        //    range.setStart(sn, 0);
        //    range.setEnd(en, 1);
        //    var selection = window.getSelection();
        //    selection.removeAllRanges();
        //    selection.addRange(range);
        //};
        Editor.prototype.addProperties = function (props) {
            var _this = this;
            var list = [];
            props.forEach(function (prop) {
                list.push(_this.addProperty(prop));
            });
            return list;
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
                        var left = this.createBracketNode(prop, propertyType.bracket.left, sn.parentElement, sn);
                        prop.addLeftBracket(left);
                    }
                    if (propertyType.bracket.right) {
                        var right = this.createBracketNode(prop, propertyType.bracket.right, en.parentElement, en.nextElementSibling);
                        prop.addRightBracket(right);
                    }
                }
            }
            prop.setSpanRange();
            this.data.properties.push(prop);
            if (this.onPropertyCreated) {
                this.onPropertyCreated(prop);
            }
            return prop;
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
            prop.schema = type;
            if (type.propertyValueSelector) {
                type.propertyValueSelector(prop, function (value, name) {
                    if (value) {
                        prop.value = value;
                        prop.name = name;
                    }
                });
            }
            return prop;
        };
        Editor.prototype.createBlockProperty = function (propertyTypeName) {
            var selection = this.getSelectionNodes();
            this.createBlock(selection.start, selection.end, propertyTypeName);
            var property = new Property({
                editor: this,
                schema: this.propertyType[propertyTypeName],
                guid: null,
                layer: null,
                index: propCounter++,
                type: propertyTypeName,
                startNode: selection.start,
                endNode: selection.end
            });
            this.data.properties.push(property);
            return property;
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
        Editor.prototype.createProperty = function (propertyTypeName, value, propertyRange) {
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
            var range = propertyRange || this.getSelectionNodes();
            var prop = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                type: propertyTypeName,
                startNode: range.start,
                endNode: range.end
            });
            prop.schema = type;
            if (type.bracket) {
                if (type.bracket.left) {
                    var left = this.createBracketNode(prop, type.bracket.left, range.start.parentElement, range.start);
                    prop.addLeftBracket(left);
                }
                if (type.bracket.right) {
                    var right = this.createBracketNode(prop, type.bracket.right, range.end.parentElement, range.end.nextElementSibling);
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
            return prop;
        };
        Editor.prototype.paint = function (s, i) {
            var _ = this;
            i = i || nodeIndex(s);
            var properties = this.data.properties
                .filter(function (prop) { return !prop.isDeleted && (prop.startIndex() <= i && i < prop.endIndex()); })
                .sort(function (a, b) { return a.index > b.index ? 1 : a.index == b.index ? 0 : -1; });
            properties.forEach(function (prop) {
                _.paintSpanWithProperty(s, prop);
            });
        };
        Editor.prototype.paintSpanWithProperty = function (s, prop) {
            var propertyType = prop.getPropertyType();
            if (propertyType.format == "decorate") {
                s.classList.add(propertyType.className);
            } else if (propertyType.format == "overlay") {
                if (s.classList.contains("line-break")) {
                    return;
                }
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
            //console.log({ unbind: result });
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
            //console.log("Text length", len);
            var properties = model.properties.filter(item => !item.isZeroPoint)
                .sort((a, b) => a.index > b.index ? 1 : a.index < b.index ? -1 : 0);
            var propertiesLength = properties.length;
            for (var i = 0; i < propertiesLength; i++) {
                var p = properties[i];
                //console.log("Property", p);
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
                    schema: type,
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
                            var left = this.createBracketNode(prop, type.bracket.left, startNode.parentElement, startNode);
                            prop.addLeftBracket(left);
                        }
                        if (type.bracket.right) {
                            var right = this.createBracketNode(prop, type.bracket.right, endNode.parentElement, endNode.nextElementSibling);
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
            this.setAnimationFrame();
        };
        Editor.prototype.createBracketNode = function (prop, bracket, parent, next) {
            var content = typeof bracket.content == "function" ? bracket.content(prop, this) : bracket.content;
            var bracketNode = this.newSpan(content);
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
            //console.log({ zeroProperties });
            for (var i = 0; i < zeroPropertiesLength; i++) {
                var p = zeroProperties[i];
                //console.log("Zero-point property", p);
                var pt = this.propertyType[p.type];
                if (!pt) {
                    console.warn("Property type not found.", p);
                    continue;
                }
                if (p.startIndex < 0) {
                    console.warn("StartIndex less than zero.", p);
                    continue;
                }
                if (p.endIndex > len) {
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
                prop.schema = pt;
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
                //if (this.onCharacterAdded) {
                //    this.onCharactedAdded(span, this);
                //}
                if (code == SPACE) {
                    // span.textContent = String.fromCharCode(160);
                }
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
