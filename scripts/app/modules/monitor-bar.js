(function (factory) {
    define("speedy/monitor-bar", [], factory);
}(function () {

    var maxWhile = 10000;

    function hasProperties(obj) {
        if (!obj) {
            return false;
        }
        return Object.getOwnPropertyNames(obj).length;
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
                console.log("Exceeded max iterations", { method: "monitor-bar/getParent", s });
                return s;
            }
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
        MonitorBar.prototype.update = function (data) {
            if (!this.monitor) {
                return;
            }
            var _ = this;
            const props = data.properties;
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
                range.style.display = "inline";
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
                var options = document.createElement("SPAN");
                if (link) {
                    options.appendChild(link);
                }
                options.appendChild(layer);
                options.appendChild(comment);
                options.appendChild(shiftLeft);
                options.appendChild(shiftRight);
                options.appendChild(expand);
                options.appendChild(contract);
                options.appendChild(del);
                if (prop.isZeroPoint) {
                    options.appendChild(zeroPointLabel);
                }
                if (showConvertToZeroPoint) {
                    options.appendChild(toZeroPoint);
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
                        options.appendChild(attr);
                    });
                }
                var openArrow = document.createElement("SPAN");
                openArrow.speedy = {
                    options: options
                };
                openArrow.classList.add("monitor-arrow");
                openArrow.innerHTML = "<span data-toggle='tooltip' data-original-title='Open' class='fa fa-chevron-circle-right monitor-arrow-icon'></span>";
                openArrow.addEventListener("click", function (e) {
                    var button = e.target.parentElement;
                    button.style.display = "none";
                    button.speedy.closeArrow.style.display = "inline";
                    button.speedy.options.style.display = "inline";
                });
                var closeArrow = document.createElement("SPAN");
                closeArrow.speedy = {
                    options: options
                };
                closeArrow.classList.add("monitor-arrow");
                closeArrow.innerHTML = "<span data-toggle='tooltip' data-original-title='Close' class='fa fa-chevron-circle-left monitor-arrow-icon'></span>";
                closeArrow.style.display = "none";
                closeArrow.addEventListener("click", function (e) {
                    var button = e.target.parentElement;
                    button.speedy.openArrow.style.display = "inline";
                    button.style.display = "none";
                    button.speedy.options.style.display = "none";
                });
                openArrow.speedy.closeArrow = closeArrow;
                closeArrow.speedy.openArrow = openArrow;
                options.style.display = "none";
                range.appendChild(closeArrow);
                range.appendChild(openArrow);
                range.appendChild(options);
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