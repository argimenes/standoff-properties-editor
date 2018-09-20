(function (factory) {
    define("app/modules/standoff-properties-editor", ["app/utils"], factory);
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
            if (node.isZeroPoint) {
                return;
            }
            text += node.textContent;
        });
        return text;
    }

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

    function allNodesBetween(startNode, endNode) {
        var nodes = [];
        whileNext(startNode, endNode, function (node) {
            nodes.push(node);
        });
        return nodes;
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
        while (node && ((node = node.previousElementSibling) != null)) {
            if (!node.isZeroPoint) {
                i++;
            }
        }
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
            this.attributes = cons.attributes || {};
            this.isZeroPoint = cons.isZeroPoint || false;
            this.isDeleted = cons.isDeleted;
        }
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
            return childNodeIndex(this.startNode);
        };
        Property.prototype.endIndex = function () {
            if (this.endNode.isZeroPoint) {
                return null;
            }
            return childNodeIndex(this.endNode);
        };
        Property.prototype.convertToZeroPoint = function () {
            var zero = this.clone();
            var nextElement = this.endNode.nextElementSibling;
            var range = { start: this.startNode, end: this.endNode };
            var text = getRangeText(range);
            this.editor.deleteRange(range);
            var span = newSpan(text);
            span.isZeroPoint = true;
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
                if (propertyType.format == "style") {
                    s.classList.remove(className);
                } else if (propertyType.format == "entity") {
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
        Property.prototype.shiftLeft = function () {
            this.unsetSpanRange();
            this.shiftStartProperties(this.startNode, this.startNode.previousElementSibling);
            this.shiftEndProperties(this.endNode, this.endNode.previousElementSibling);
            this.startNode = this.startNode.previousElementSibling;
            this.endNode = this.endNode.previousElementSibling;
            this.setSpanRange();
        };
        Property.prototype.shiftRight = function () {
            this.unsetSpanRange();
            this.shiftStartProperties(this.startNode, this.startNode.nextElementSibling);
            this.shiftEndProperties(this.endNode, this.endNode.nextElementSibling);
            this.startNode = this.startNode.nextElementSibling;
            this.endNode = this.endNode.nextElementSibling;
            this.setSpanRange();
        };
        Property.prototype.expand = function () {
            this.unsetSpanRange();
            this.shiftEndProperties(this.endNode, this.endNode.nextElementSibling);
            this.endNode = this.endNode.nextElementSibling;
            this.setSpanRange();
        };
        Property.prototype.contract = function () {
            this.unsetSpanRange();
            this.shiftEndProperties(this.endNode, this.endNode.previousElementSibling);
            this.endNode = this.endNode.previousElementSibling;
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
            whileNext(this.startNode, this.endNode, function (s) {
                var className = _this.className || propertyType.className || propertyType.zeroPoint.className;
                if (propertyType.format == "style") {
                    s.classList.remove(className);
                } else if (propertyType.format == "entity") {
                    unsetSpanRange(s, className);
                }
            }.bind(this));
            if (propertyType.unstyleRenderer) {
                propertyType.unstyleRenderer(allNodesBetween(this.startNode, this.endNode), this);
            }
        };
        Property.prototype.showSpanRange = function () {
            var _this = this;
            var propertyType = this.getPropertyType();
            whileNext(this.startNode, this.endNode, function (s) {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "style") {
                    s.classList.add(className);
                } else if (propertyType.format == "entity") {
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
            var format = propertyType.format;
            whileNext(this.startNode, this.endNode, function (s) {
                var className = _this.className || (_this.isZeroPoint ? propertyType.zeroPoint.className : propertyType.className);
                if (format == "style" || _this.isZeroPoint) {
                    s.classList.add(className);
                } else if (format == "entity" && !_this.isZeroPoint) {
                    var inner = document.createElement("DIV");
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
            this.editor.monitor.textContent = "";
            if (this.editor.onPropertyDeleted) {
                this.editor.onPropertyDeleted(this);
            }
            if (this.isZeroPoint) {
                this.startNode.remove();
            }
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
            var ei = this.isZeroPoint ? null : this.endIndex();
            if (this.isZeroPoint) {
                text = this.startNode.textContent;
            }
            else {
                var len = ei - si + 1;
                if (len > 0) {
                    len = this.editor.unbinding.maxTextLength || len;
                    var statementText = this.editor.unbindText();
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
            this.monitor = (cons.monitor instanceof HTMLElement) ? cons.monitor : document.getElementById(cons.monitor);
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
            this.monitorOptions = cons.monitorOptions || {};
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
        Editor.prototype.getPropertyAtCursor = function () {
            var _this = this;
            var node = this.getCurrent();
            var enclosing = this.data.properties.where(function (prop) {
                return isWithin(prop.startNode, prop.endNode, node);
            });
            if (!enclosing.length) {
                return null;
            }
            var i = childNodeIndex(node);
            var ordered = enclosing.sort(function (a, b) {
                var propa = a.toNode();
                var propb = b.toNode();
                var da = i - propa.startIndex;
                var db = i - propb.startIndex;
                return da > db ? 1 : da == db ? 0 : -1;
            });
            var nearest = ordered[0];
            return nearest;
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
                    nearest.setSpanRange();
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
                var propertyType = this.propertyType[prop.type];
                var range = newSpan();
                range.style.marginRight = "10px";
                var labelRenderer = propertyType.labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;
                var type = newSpan(label);
                type.property = prop;
                if (_.monitorOptions.highlightProperties) {
                    type.addEventListener("mouseover", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                        }, 1);                        
                    });
                    type.addEventListener("mouseout", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                        });
                    }, 1);
                }
                if (!!prop.value) {
                    var link = newSpan(this.monitorButton.link || "[O-O]");
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
                var layer = newSpan(this.monitorButton.layer || "[=]");
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
                var del = newSpan(this.monitorButton.remove || "[x]");
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
                var comment = newSpan(this.monitorButton.comment || "[.oO]");
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
                var shiftLeft = newSpan(this.monitorButton.shiftLeft || "<-");
                shiftLeft.property = prop;
                shiftLeft.style.marginLeft = "5px";
                shiftLeft.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.shiftLeft();
                });
                var shiftRight = newSpan(this.monitorButton.shiftRight || "->");
                shiftRight.property = prop;
                shiftRight.style.marginLeft = "5px";
                shiftRight.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.shiftRight();
                });
                var expand = newSpan(this.monitorButton.expand || "[+]");
                expand.property = prop;
                expand.style.marginLeft = "5px";
                expand.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.expand();
                });
                var contract = newSpan(this.monitorButton.contract || "[-]");
                contract.property = prop;
                contract.style.marginLeft = "5px";
                contract.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.contract();
                });
                if (prop.isZeroPoint) {
                    if (propertyType.zeroPoint) {
                        if (propertyType.zeroPoint.selector) {
                            var zeroPointLabel = newSpan(this.monitorButton.zeroPointLabel || "[label]");
                            zeroPointLabel.property = prop;
                            zeroPointLabel.style.marginLeft = "5px";
                            zeroPointLabel.addEventListener("click", function (e) {
                                var span = getParent(e.target, function (x) { return !!x.property; });
                                if (!span) {
                                    return;
                                }
                                var p = span.property;
                                propertyType.zeroPoint.selector(p, function (label) {
                                    p.setZeroPointLabel(label);
                                });
                            });
                        }
                    }
                }
                var showConvertToZeroPoint = (propertyType.zeroPoint && propertyType.zeroPoint.offerConversion && propertyType.zeroPoint.offerConversion(prop));
                if (showConvertToZeroPoint) {
                    var toZeroPoint = newSpan(this.monitorButton.toZeroPoint || "[Z]");
                    toZeroPoint.property = prop;
                    toZeroPoint.style.marginLeft = "5px";
                    toZeroPoint.addEventListener("click", function (e) {
                        var span = getParent(e.target, function (x) { return !!x.property; });
                        if (!span) {
                            return;
                        }
                        var p = span.property;
                        p.convertToZeroPoint();
                    });
                }
                range.appendChild(type);
                if (link) {
                    range.appendChild(link);
                }
                range.appendChild(layer);
                range.appendChild(comment);
                range.appendChild(shiftLeft);
                range.appendChild(shiftRight);
                range.appendChild(expand);
                range.appendChild(contract);
                range.appendChild(del);
                if (prop.isZeroPoint) {
                    range.appendChild(zeroPointLabel);
                }
                if (showConvertToZeroPoint) {
                    range.appendChild(toZeroPoint);
                }
                if (hasProperties(propertyType.attributes)) {
                    var attrs = [];
                    for (var key in propertyType.attributes) {
                        var attribute = propertyType.attributes[key];
                        var label = attribute.renderer(prop);
                        var attr = newSpan(label);
                        attr.speedy = {};
                        attr.speedy.property = prop;
                        attr.speedy.attributeName = key;
                        attr.style.marginLeft = "5px";
                        attr.addEventListener("click", function (e) {
                            var span = getParent(e.target, function (x) { return !!x.speedy && !!x.speedy.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.speedy.property;
                            var name = span.speedy.attributeName;
                            _.propertyType[p.type].attributes[name].selector(p, function (value) {
                                p.attributes[name] = value;
                            });
                        });
                        attrs.push(attr);
                    }
                    attrs.forEach(function (attr) {
                        range.appendChild(attr);
                    });
                }
                this.monitor.appendChild(range);
                if (this.onMonitorUpdated) {
                    this.onMonitorUpdated(select(props, function (p) { return { type: p.type, format: _.propertyType[p.type].format }; }));
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
            var isZeroPoint = current.isZeroPoint;
            if (isZeroPoint) {
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
            var isZeroPoint = next.isZeroPoint;
            if (isZeroPoint) {
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
            var canEdit = !!!this.lockText;
            var canAnnotate = !!!this.lockProperties;
            var isFirst = !this.container.children.length;
            var current = this.getCurrent();
            var key = evt.which || evt.keyCode;
            var range = this.getSelectionNodes();
            var hasSelection = (range && range.start != range.end);
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
            } else if (key >= LEFT_ARROW && key <= DOWN_ARROW) {
                this.updateCurrentRanges();
                return true;
            } else if (key == HOME || key == END) {
                this.updateCurrentRanges();
                return true;
            }
            else if (evt.ctrlKey) {
                if (canAnnotate) {
                    if (evt.key == "a" || evt.key == "Control") {
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
                // Overwrite selected range by first deleting it.
                this.deleteRange(range);
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
                this.container.insertBefore(span, next);
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            this.updateCurrentRanges();
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
            var node = this.container.firstChild;
            while (node != null && i > 0) {
                if (!node.isZeroPoint) {
                    i--;
                }
                node = node.nextElementSibling;
            }
            return node;
        };
        Editor.prototype.addProperty = function (p) {
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
                endNode: en
            });
            prop.text = p.text;
            sn.startProperties.push(prop);
            en.endProperties.push(prop);
            prop.setSpanRange();
            this.data.properties.push(prop);
            if (this.onPropertyCreated) {
                this.onPropertyCreated(prop);
            }
        };
        Editor.prototype.addZeroPoint = function (type, content, position) {
            var span = newSpan(content);
            span.isZeroPoint = true;
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
            if (propertyType.format == "style") {
                s.classList.add(propertyType.className);
            } else if (propertyType.format == "entity") {
                var inner = document.createElement("DIV");
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
            return {
                text: this.unbindText(),
                properties: this.toPropertyNodes()
            };
        };
        Editor.prototype.unbindText = function () {
            var result = "";
            var node = this.container.firstChild;
            while (node != null) {
                if (!node.isZeroPoint) {
                    result += node.textContent;
                }
                node = node.nextElementSibling;
            }
            return result;
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
            var len = this.data.text.length;
            console.log("Text length", len);
            var properties = model.properties.filter(function (item) {
                return !item.isZeroPoint;
            }).sort(function (a, b) { return a.index > b.index ? 1 : a.index < b.index ? -1 : 0; });
            var propertiesLength = properties.length;
            for (var i = 0; i < propertiesLength; i++) {
                var p = properties[i];
                console.log("Property", p);
                var type = this.propertyType[p.type];
                if (!type) {
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
                var startNode = this.container.children[p.startIndex];
                if (!startNode) {
                    console.warn("Start node not found.", p);
                    continue;
                }
                var endNode = this.container.children[p.endIndex];
                if (!endNode) {
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
                startNode.startProperties.push(prop);
                endNode.endProperties.push(prop);
                prop.setSpanRange();
                this.data.properties.push(prop);
                propCounter = this.data.properties.length;
            }
            this.bindZeroLengthAnnotations(model);
        };
        Editor.prototype.bindZeroLengthAnnotations = function (model) {
            var len = model.text.length;
            var zeroProperties = model.properties.filter(function (item) {
                return item.isZeroPoint;
            }).sort(function (a, b) { return a.startIndex < b.startIndex ? 1 : a.startIndex < b.startIndex ? -1 : 0; });
            var zeroPropertiesLength = zeroProperties.length;
            // Work backwards through the list of zero properties so we don't fetch a SPAN that hasn't been offset from a previous insertion.
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
                var node = this.container.children[p.startIndex - 1];
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
        };
        Editor.prototype.textToDocumentFragment = function (text) {
            var len = text.length;
            var skip = [LINE_FEED];
            var frag = document.createDocumentFragment();
            for (var i = 0; i < len; i++) {
                var c = text.substr(i, 1);
                var code = c.charCodeAt();
                if (skip.indexOf(code) >= 0) {
                    continue;
                }
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