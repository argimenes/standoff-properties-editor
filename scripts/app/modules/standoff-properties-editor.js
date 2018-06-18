(function (factory) {
    define(["app/utils"], factory);
}(function (utils) {

    var where = utils.where;
    var each = utils.each;
    var find = utils.find;
    var select = utils.select;

    Array.prototype.where = function (func) {
        return where(this, func);
    };
    Array.prototype.each = function (func) {
        return each(this, func);
    };

    var BACKSPACE = 8,
        DELETE = 46, HOME = 36, END = 35,
        LEFT_ARROW = 37, RIGHT_ARROW = 39, UP_ARROW = 38, DOWN_ARROW = 40, SPACE = 32,
        SHIFT = 16, CTRL = 17, ALT = 18, ENTER = 13, TAB = 9, LEFT_WINDOW_KEY = 91, SCROLL_LOCK = 145,
        RIGHT_WINDOW_KEY = 92, F1 = 112;

    function getParent(startNode, func) {
        var s = startNode, loop = true;
        while (loop) {
            if (func(s)) {
                return s;
            }
            s = s.parentElement;
        }
        return null;
    }

    function whileNext(startNode, endNode, func) {
        var s = startNode, loop = true;
        while (loop) {
            func(s);
            loop = (s != endNode && s.nextElementSibling);
            s = s.nextElementSibling;
        }
    }

    function isAfter(start, node) {
        var found = false;
        var loop = true;
        var temp = node;
        while (loop && temp) {
            if (start == temp) {
                loop = false;
                found = true;
            }            
            temp = temp.previousElementSibling;
            if (temp == null) {
                loop = false;
            }
        }
        return found;
    }

    function isBefore(start, node) {
        var found = false;
        var loop = true;
        var temp = node;
        while (loop && temp) {
            if (start == temp) {
                loop = false;
                found = true;
            }
            temp = temp.nextElementSibling;
            if (temp == null) {
                loop = false;
            }
        }
        return found;
    }

    function isWithin(start, end, node) {
        return isAfter(start, node) && isBefore(end, node);
    }

    function indexOf(arr, comparer) {
        for (var i = 0; i < arr.length; i++) {
            if (comparer(arr[i])) {
                return i;
            }
        }
        return -1;
    }

    function childNodeIndex(node) {
        var i = 0;
        while (node && ((node = node.previousElementSibling) != null)) i++;
        return i;
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

    function newSpan(text) {
        var s = document.createElement("SPAN");
        s.style.position = "relative";
        if (text) {
            s.innerHTML = text;
        }
        s.startProperties = [];
        s.endProperties = [];
        return s;
    }

    function unsetSpanRange(span, className) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        span.removeChild(div);
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
            this.editor = cons.editor;
            this.guid = cons.guid;
            this.index = cons.index;
            this.type = cons.type;
            this.value = cons.value;
            this.layer = cons.layer;
            this.startNode = cons.startNode;
            this.endNode = cons.endNode;
            this.isDeleted = cons.isDeleted;
        }
        Property.prototype.startIndex = function () {
            return childNodeIndex(this.startNode);
        };
        Property.prototype.endIndex = function () {
            return childNodeIndex(this.endNode);
        };
        Property.prototype.hideSpanRange = function () {
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                if (propertyType.format == "style") {
                    s.classList.remove(propertyType.className);
                } else if (propertyType.format == "entity") {
                    hideLayer(s, this.layer);
                }
            }.bind(this));
        };
        Property.prototype.getPropertyType = function () {
            var _ = this;
            return find(this.editor.propertyType, function (item, key) {
                return key == _.type;
            });
        };
        Property.prototype.unsetSpanRange = function () {
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                if (propertyType.format == "style") {
                    s.classList.remove(propertyType.className);
                } else if (propertyType.format == "entity") {
                    unsetSpanRange(s, propertyType.className);
                }
            }.bind(this));
        };
        Property.prototype.showSpanRange = function () {
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                if (propertyType.format == "style") {
                    s.classList.add(propertyType.className);
                } else if (propertyType.format == "entity") {
                    showLayer(s, this.layer);
                }
            }.bind(this));
        };
        Property.prototype.setSpanRange = function () {
            if (this.isDeleted) {
                return;
            }
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                if (propertyType.format == "style") {
                    s.classList.add(propertyType.className);
                } else if (propertyType.format == "entity") {
                    var inner = document.createElement("DIV");
                    inner.setAttribute("data-layer", this.layer);
                    inner.classList.add("overlaid");
                    inner.classList.add(propertyType.className);
                    s.appendChild(inner);
                }
            }.bind(this));
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
            this.editor.monitor.textContent = "";
            if (this.editor.onPropertyDeleted) {
                this.editor.onPropertyDeleted(this);
            }
        };
        Property.prototype.toNode = function () {
            var __ = this;
            var text = null;
            var si = this.startIndex();
            var ei = this.endIndex();
            var len = ei - si + 1;
            if (len > 0) {
                len = this.editor.unbinding.maxTextLength || len;
                var statementText = this.editor.container.textContent;
                text = statementText.substr(si, len);
            }
            var data = {
                index: this.index,
                guid: this.guid || null,
                type: this.type,
                layer: this.layer,
                text: text,
                value: this.value,
                startIndex: si,
                endIndex: ei,
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
            this.monitor = (cons.monitor instanceof HTMLElement) ? cons.monitor : document.getElementById(cons.monitor);
            this.onPropertyCreated = cons.onPropertyCreated;
            this.onPropertyChanged = cons.onPropertyChanged;
            this.onPropertyDeleted = cons.onPropertyDeleted;
            this.onPropertyUnbound = cons.onPropertyUnbound;
<<<<<<< HEAD
            this.onMonitorUpdated = cons.onMonitorUpdated;
=======
            this.unbinding = cons.unbinding || {};
>>>>>>> 6c3d9fbb98abc0d5973bff860a20e79269dc6dc9
            this.data = {
                text: null,
                properties: []
            };
            this.publisher = {
                layerAdded: []
            };
            this.propertyType = cons.propertyType;
            this.commentManager = cons.commentManager;
            this.monitorButton = cons.monitorButton || {};
            this.setupEventHandlers();
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
        Editor.prototype.handleDoubleClickEvent = function (e) {
            var _this = this;
            var props = this.data.properties.where(function (prop) {
                var propertyType = prop.getPropertyType();
                return propertyType.propertyValueSelector && isWithin(prop.startNode, prop.endNode, e.target);
            });
            if (!props.length) {
                return;
            }
            var i = childNodeIndex(e.target);
            var nearest = props.sort(function (a, b) {
                var propa = a.toNode();
                var propb = b.toNode();
                var da = i - propa.startIndex;
                var db = i - propb.startIndex;
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
                    if (_this.onPropertyChanged) {
                        _this.onPropertyChanged(nearest);
                    }
                }
            });
        };
        Editor.prototype.updateCurrentRanges = function (span) {
            window.setTimeout(function () {
                if (!span) {
                    span = this.getCurrent();
                }
                this.setMonitor([]);
                var props = where(this.data.properties, function (prop) {
                    return !prop.isDeleted && isWithin(prop.startNode, prop.endNode, span);
                });
                this.setMonitor(props || []);
            }.bind(this), 1);
        };
        Editor.prototype.setMonitor = function (props) {
            this.monitor.textContent = "";
            if (!props || !props.length) {
                if (this.onMonitorUpdated) {
                    this.onMonitorUpdated([]);
                }
                return;
            }
            var _ = this;
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var range = newSpan();
                range.style.marginRight = "10px";
                var labelRenderer = this.propertyType[prop.type].labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;
                var type = newSpan(label);
                if (!!prop.value) {
                    var link = newSpan(this.monitorButton.link);
                    link.property = prop;
                    link.style.marginLeft = "5px";
                    link.addEventListener("click", function (e) {
                        var span = getParent(e.target, function (x) { return !!x.property; });
                        if (!span) {
                            return;
                        }
                        var p = span.property;
                        _.propertyType[p.type].propertyValueSelector(p, function (guid, name) {
                            if (guid) {
                                p.value = guid;
                                p.name = name;                                
                                _.updateCurrentRanges(p.startNode);
                                if (_.onPropertyChanged) {
                                    _.onPropertyChanged(p);
                                }
                            }
                        });
                        _.updateCurrentRanges(p.startNode);
                    });
                }
                var layer = newSpan(this.monitorButton.layer);
                layer.property = prop;
                layer.style.marginLeft = "5px";
                layer.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    var name = prompt("What is the name of the layer", p.layer || "");
                    if (!!name) {
                        p.setLayer(name);
                        _.layerAdded({ state: "added", data: name });
                    }
                });
                var del = newSpan(this.monitorButton.remove);
                del.property = prop;
                del.style.marginLeft = "5px";
                del.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.remove();
                });
                var comment = newSpan(this.monitorButton.comment);
                comment.property = prop;
                comment.style.marginLeft = "5px";
                comment.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    _.commentManager(p);
                });
                range.appendChild(type);
                if (link) {
                    range.appendChild(link);
                }
                range.appendChild(layer);
                range.appendChild(comment);
                range.appendChild(del);
                this.monitor.appendChild(range);
                if (this.onMonitorUpdated) {
                    this.onMonitorUpdated(select(props, function(p){ return { type: p.type, format: _.propertyType[p.type].format }; }));
                }
            }
        };
        Editor.prototype.handleMouseClickEvent = function (evt) {
            this.updateCurrentRanges();
        };
        Editor.prototype.handleMouseUpEvent = function (evt) {
            this.updateCurrentRanges(evt.target);
        };
        // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
        Editor.prototype.handleOnPasteEvent = function (e) {
            e.stopPropagation();
            e.preventDefault();
            var clipboardData = e.clipboardData || window.clipboardData;
            var text = clipboardData.getData('text');
            var frag = this.textToDocumentFragment(text);
            if (this.container.children.length) {
                this.container.insertBefore(frag, e.target.nextElementSibling);
            } else {
                this.container.appendChild(frag);
            }
            this.setCarotByNode(e.target);
            this.updateCurrentRanges();
        };
        Editor.prototype.handleBackspace = function (current, updateCarot) {
            var _ = this;            
            var previous = current.previousElementSibling;
            var next = current.nextElementSibling;            
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
            var node = range.end;
            while (node != range.start) {
                var prev = node.previousElementSibling;
                this.handleBackspace(node);
                node = prev;
            }
            this.handleBackspace(range.start, true);
        };
        Editor.prototype.handleKeyDownEvent = function (evt) {
            var _ = this;
            var isFirst = !this.container.children.length;
            var current = this.getCurrent();            
            var key = evt.which || evt.keyCode;
            var range = this.getSelectionNodes();
            var hasSelection = (range && range.start != range.end);
            if (key == BACKSPACE) {
                if (hasSelection) {
                    this.deleteRange(range);
                }
                else {
                    this.handleBackspace(current, true);
                }
                this.updateCurrentRanges();
                evt.preventDefault();
                return;
            } else if (key == DELETE) {
                if (hasSelection) {
                    this.deleteRange(range);
                }
                else {
                    this.handleDelete(current);
                }
                this.updateCurrentRanges();
                evt.preventDefault();
                return;
            } else if (key >= LEFT_ARROW && key <= DOWN_ARROW) {
                this.updateCurrentRanges();
                return true;
            } else if (key == HOME || key == END) {
                this.updateCurrentRanges();
                return true;
            }
            else if (evt.ctrlKey) {
                if (evt.key == "a") {
                    return;
                } else if (evt.key == "b") {
                    evt.preventDefault();
                    this.modeClicked("bold");
                } else if (evt.key == "i") {
                    evt.preventDefault();
                    this.modeClicked("italics");
                } else if (evt.key == "u") {
                    evt.preventDefault();
                    this.modeClicked("delete");
                } else if (evt.key == "a") {
                    evt.preventDefault();
                    this.modeClicked("agent");
                } else if (evt.key == "u") {
                    evt.preventDefault();
                    this.modeClicked("superscript");
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
                // Overwrite selected range by first deleting it.
                this.deleteRange(range);
            }

            evt.preventDefault();
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
                this.container.insertBefore(span, next);                              
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            this.updateCurrentRanges();
        };
        Editor.prototype.handleSpecialChars = function (span, charCode) {
            //if (charCode == SPACE) {
            //    //span.textContent = String.fromCharCode(160);
            //}
            if (charCode == ENTER) {
                span.textContent = String.fromCharCode(13);
                span.classList.add("line-break");
            }
            if (charCode == TAB) {
                span.textContent = String.fromCharCode(TAB);
                span.classList.add("tab");
            }
        };
        Editor.prototype.setCarotByNode = function (node) {
            if (!node)  {
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
            while (false == (node instanceof HTMLSpanElement)) {
                node = this.getParentSpan(node.parentElement);
            }
            return node;
        };
        Editor.prototype.getSelectionNodes = function () {
            var range = window.getSelection().getRangeAt(0);
            if (range.collapsed) {
                return null;
            }
            var endContainer = range.endContainer;
            var startSpan = this.getParentSpan(range.startContainer);
            var endSpan = this.getParentSpan(range.endContainer);
            return {
                start: startSpan,
                end: endSpan
            };
        };
        Editor.prototype.modeClicked = function (m) {
            var _this = this;
            var range = this.getSelectionNodes();
            var prop = new Property({
                editor: this,
                guid: null,
                layer: null,
                index: propCounter++,
                type: m,
                startNode: range.start,
                endNode: range.end
            });
            var process = function (p) {
                range.start.startProperties.push(p);
                range.end.endProperties.push(p);
                _this.data.properties.push(p);
                p.setSpanRange();
                if (_this.onPropertyCreated) {
                    _this.onPropertyCreated(p);
                }
            }
            var propertyType = find(this.propertyType, function (item, key) {
                return key == m && item.propertyValueSelector;
            });
            if (propertyType) {
                propertyType.propertyValueSelector(prop, function (guid, name) {
                    if (guid) {
                        prop.value = guid;
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
            if (propertyType.format == "style") {
                s.classList.add(propertyType.className);
            } else if (propertyType.format == "entity") {
                var inner = document.createElement("DIV");
                inner.setAttribute("data-layer", this.layer);
                inner.classList.add("overlaid");
                inner.classList.add(propertyType.className);
                s.appendChild(inner);
            }
        };
        Editor.prototype.unbind = function () {
            return {
                text: this.container.textContent,
                properties: this.toPropertyNodes()
            };
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
            var properties = model.properties.sort(function (a, b) { return a.index > b.index ? 1 : a.index < b.index ? -1 : 0; });
            for (var i = 0; i < properties.length; i++) {
                var p = properties[i];
                var startNode = this.container.children[p.startIndex];
                var endNode = this.container.children[p.endIndex];
                var prop = new Property({
                    editor: this,
                    layer: p.layer,
                    guid: p.guid,
                    index: p.index,
                    type: p.type,
                    value: p.value,
                    startNode: startNode,
                    endNode: endNode,
                    isDeleted: p.isDeleted
                });
                if (this.onPropertyCreated) {
                    this.onPropertyCreated(prop, p);
                }
                startNode.startProperties.push(prop);
                endNode.endProperties.push(prop);
                prop.setSpanRange();
                this.data.properties.push(prop);
                propCounter = this.data.properties.length;
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
            var len = text.length;
            var frag = document.createDocumentFragment();
            for (var i = 0; i < len; i++) {
                var c = text.substr(i, 1);
                var code = c.charCodeAt();
                var span = this.newSpan();
                span.textContent = c;
                this.handleSpecialChars(span, code);
                frag.appendChild(span);
            }
            return frag;
        };
        Editor.prototype.newSpan = newSpan;
        return Editor;
    })();

    return Editor;

}));