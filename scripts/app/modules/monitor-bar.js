(function (factory) {
    define("speedy/monitor-bar", [], factory);
}(function () {

    function hasProperties(obj) {
        if (!obj) {
            return false;
        }
        return Object.getOwnPropertyNames(obj).length;
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

    var MonitorBar = (function () {
        function MonitorBar(cons) {
            // this.editor = cons.editor;
            this.monitorOptions = cons.monitorOptions; // Todo: rename to 'options'
            this.monitorButton = cons.monitorButton;
            this.layerAdded = cons.layerAdded; // Hack: currently copied from the Editor
            this.commentManager = cons.commentManager;
            this.updateCurrentRanges = cons.updateCurrentRanges; // Hack: currently copied from the Editor
            this.css = cons.css;
            this.monitor = cons.monitor; // HTMLElement
            this.propertyType = cons.propertyType; // Hack: property types editor accepts
            this.properties = [];
        }
        MonitorBar.prototype.newSpan = function (text) {
            var s = document.createElement("SPAN");
            s.speedy = {};
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text + "&#x200d;";
            }
            s.startProperties = [];
            s.endProperties = [];
            return s;
        };
        MonitorBar.prototype.clear = function () {
            if (!this.monitor) {
                return;
            }
            this.monitor.textContent = "";
        };
        MonitorBar.prototype.setProperties = function (props) {
            if (!this.monitor) {
                return;
            }
            var _ = this;
            this.properties = props;
            this.monitor.textContent = "";
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var propertyType = this.propertyType[prop.type];
                if (!propertyType) {
                    continue;
                }
                var range = this.newSpan();
                range.style.marginRight = "10px";
                var labelRenderer = propertyType.labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;
                var type = this.newSpan(label);
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
                            span.classList.add(_.css.highlight);
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
                            span.classList.remove(_.css.highlight);
                        });
                    }, 1);
                }
                if (!!prop.value) {
                    var link = this.newSpan(this.monitorButton.link || "[O-O]");
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
                var layer = this.newSpan(this.monitorButton.layer || "[=]");
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
                var del = this.newSpan(this.monitorButton.remove || "[x]");
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
                var comment = this.newSpan(this.monitorButton.comment || "[.oO]");
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
                var shiftLeft = this.newSpan(this.monitorButton.shiftLeft || "<-");
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
                var shiftRight = this.newSpan(this.monitorButton.shiftRight || "->");
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
                var expand = this.newSpan(this.monitorButton.expand || "[+]");
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
                var contract = this.newSpan(this.monitorButton.contract || "[-]");
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
                            var zeroPointLabel = this.newSpan(this.monitorButton.zeroPointLabel || "[label]");
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
                    var toZeroPoint = this.newSpan(this.monitorButton.toZeroPoint || "[Z]");
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
                        var attr = this.newSpan(label);
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
                //if (this.onMonitorUpdated) {
                //    this.onMonitorUpdated(select(props, function (p) { return { type: p.type, format: _.propertyType[p.type].format }; }));
                //}
            }
        };

        return MonitorBar;
    })();

    return MonitorBar;
}));