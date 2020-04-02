(function (factory) {
    define("part/text-edit", ["speedy/editor", "speedy/monitor-bar", "knockout", "jquery", "speedy/arabic-shaping", "bootstrap"], factory);
}(function (Speedy, MonitorBar, ko, $, ArabicShaping) {

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    function defined(value) {
        return typeof value != "undefined";
    }

    // useful for HtmlCollection, NodeList, String types (array-like types)
    function forEach(array, callback, scope) {
        for (var i = 0, n = array.length; i < n; i++) {
            callback.call(scope, array[i], i, array);
        }
    } // passes back stuff we need

    function changeCss(selectorText, tgtAttribName, newValue) {
        var styleSheets = document.styleSheets;
        forEach(styleSheets, styleSheetFunc);

        function styleSheetFunc(sheet) {
            try {
                forEach(sheet.cssRules, cssRuleFunc);
            } catch (ex) {

            }
        }

        function cssRuleFunc(rule) {
            if (selectorText.indexOf(rule.selectorText) != -1) {
                forEach(rule.style, cssRuleAttributeFunc);
            }

            function cssRuleAttributeFunc(attribName) {
                if (attribName == tgtAttribName) {
                    rule.style[attribName] = newValue;
                    console.log('attribute replaced');
                }
            }
        }
    }

    var openModalFromNode = function (contentNode, settings) {
        settings = settings || {};
        var modal = document.createElement("DIV");
        modal.classList.add("modal");
        modal.style.display = "none";
        document.body.appendChild(modal);
        var modalText = document.createElement("DIV");
        modalText.classList.add("modal-text");
        modalText.innerHTML = contentNode.innerHTML;
        modal.appendChild(modalText);
        modal.style.visibility = "visible";
        modalText.style.margin = "0 auto";
        modalText.style.width = "80%";
        modalText.style.backgroundColor = "rgb(239, 239, 239)";
        $(modal).modal("show");
        var content = modal.children[0];
        content.classList.add("modal-dialog");
        if (settings.contentAdded) {
            settings.contentAdded(modal);
        }
    }

    var Model = (function () {
        function Model(cons) {
            var _this = this;
            this.constructorData = cons;
            this.file = ko.observable("ReggF3-H19-316.json");
            this.files = ko.observableArray([
                { text: "Regesta Imperii", value: "ReggF3-H19-316.json" },
                { text: "Regesta Imperii without annotations", value: "ReggF3-H19-316-no-annotations.json" },
                { text: "Overlapping annotations on Liszt", value: "adam-liszt.json" },
                { text: "Hildergard von Bingen (#51)", value: "HildegardR51.json" },
                { text: "Hildergard von Bingen (#52)", value: "HildegardR52.json" },
                { text: "DTA-Basisformat XML -> SPEEDy", value: "dta2spo.json" },
                { text: "TEI-XML -> SPEEDY (I)", value: "xml2spo.json" },
                { text: "TEI-XML -> SPEEDY (II)", value: "xml2spo2.json" },
                { text: "TEI-XML -> SPEEDY (III)", value: "xml2spo3.json" },
                { text: "TEI-XML -> SPEEDY (IV)", value: "xml2spo3a.json" },
                { text: "Michelangelo letter with text alignment", value: "michelangelo-text-block.json" },
                { text: "Arabic script (RTL and ligature test)", value: "arabic.json" },
            ]);
            this.TEI = ko.observable();
            this.list = {
                TEI: ko.observableArray([
                    "tei/core/date",
                    "tei/core/item",
                    "tei/core/label",
                    "tei/core/list",
                    "tei/core/name",
                    "tei/core/num",
                    "tei/core/quote",
                    "tei/core/said",
                    "tei/core/time",
                    "tei/core/unclear",
                    "tei/core/unit",
                    "tei/textstructure/argument",
                    "tei/textstructure/closer",
                    "tei/textstructure/dateline",
                    "tei/textstructure/opener",
                    "tei/textstructure/postscript",
                    "tei/textstructure/salute",
                    "tei/textstructure/signed",
                    "tei/verse/caesura",
                    "tei/verse/metDecl",
                    "tei/verse/metSym",
                    "tei/verse/rhyme",
                ])
            };
            this.blacklist = ko.observable("div, body, text, p");
            this.lineHeight = ko.observable("2em");
            this.fontSize = ko.observable("1.5em");
            this.fontFamily = ko.observable("monospace");
            this.textColour = ko.observable("#000");
            this.backgroundColour = ko.observable("#FFF");
            this.currentModes = ko.observableArray([]);
            this.userGuid = "abcd-efgh-ijkl-mnop";
            this.viewer = ko.observable();
            this.editor = null; // Instantiated in setupEditor()
            this.checkbox = {
                expansions: ko.observable(true)
            };
            this.checkbox.expansions.subscribe(function () {
                return _this.showHideExpansions();
            });
        }
        Model.prototype.showHideExpansions = function () {
            var show = this.checkbox.expansions();
            var expansions = this.editor.data.properties.filter(p => p.type == "expansion" || p.type == "line" || p.type == "leiden/expansion" || p.type == "leiden/line");
            expansions.forEach(p => show ? p.showBrackets() : p.hideBrackets());
        };
        Model.prototype.applyBindings = function(node) {
            ko.applyBindings(this, node);
            this.setupEditor();
        };
        Model.prototype.setupEditor = function(settings) {
            settings = settings || {};
            var cons = this.constructorData;
            var _this = this;
            this.container =  settings.container ? settings.container : cons.template.querySelectorAll("[data-role='editor']")[0];
            this.monitor =  settings.monitor ? settings.monitor : cons.template.querySelectorAll("[data-role='monitor']")[0];
            var configuration = {
                container: this.container,
                direction: settings.direction ? settings.direction : null,
                onPropertyCreated: function (prop, data) {
                    // Copy the custom fields across from the JSON data to the Property.
                    if (!data) {
                        prop.userGuid = _this.userGuid;
                        return;
                    }
                    prop.userGuid = data.userGuid;
                    prop.deletedByUserGuid = data.deletedByUserGuid;
                    prop.modifiedByUserGuid = data.modifiedByUserGuid;
                },
                onPropertyChanged: function (prop) {
                    if (!_this.userGuid) {
                        return;
                    }
                    prop.modifiedByUserGuid = _this.userGuid;
                },
                onPropertyDeleted: function (prop) {
                    if (!_this.userGuid) {
                        return;
                    }
                    prop.deletedByUserGuid = _this.userGuid;
                },
                onPropertyUnbound: function (data, prop) {
                    // Copy the custom fields across from the Property to the JSON data.
                    data.userGuid = prop.userGuid;
                    data.deletedByUserGuid = prop.deletedByUserGuid;
                    data.modifiedByUserGuid = prop.modifiedByUserGuid;
                },
                onMonitorUpdated: function (types) {
                    _this.currentModes([]);
                    var modes = types.filter(function (x) { return x.format == "decorate"; }).map(function (x) { return x.type; });
                    _this.currentModes(modes);
                },
                commentManager: function (prop) {
                    // Handle the adding of a user comment to any standoff property.
                    var value = prompt("Comment", prop.value || "");
                    process(value);
                },
                onCharacterAdded: function (current, editor) {
                    console.log({ current, editor });
                    var getPrevious = (span) => span.previousElementSibling;
                    var getNext = (span) => span.nextElementSibling;
                    var previous = getPrevious(current);
                    var next = getNext(current);
                    var addZwj = ArabicShaping.addZwj;
                    var isArabicChar = ArabicShaping.isArabicChar;
                    if (false == isArabicChar(current.textContent)) {
                        return;
                    }
                    if (previous) {
                        var pchar = (getPrevious(previous) || {}).textContent;
                        var nchar = (getNext(previous) || {}).textContent;
                        previous.innerHTML = addZwj(previous.textContent, pchar, nchar);
                    }
                    if (current) {
                        var pchar = (getPrevious(current) || {}).textContent;
                        var nchar = (getNext(current) || {}).textContent;
                        current.innerHTML = addZwj(current.textContent, pchar, nchar);
                    }
                    if (next) {
                        var pchar = (getPrevious(next) || {}).textContent;
                        var nchar = (getNext(next) || {}).textContent;
                        next.innerHTML = addZwj(next.textContent, pchar, nchar);
                    }
                },
                monitorOptions: {
                    highlightProperties: true
                },
                css: {
                    highlight: "text-highlight"
                },
                monitorButton: {
                    link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                    layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                    toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                    zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                },
                unbinding: {
                    //maxTextLength: 20
                },
                propertyType: {
                    "tab": {
                        format: "decorate",
                        zeroPoint: {
                            className: "tab"                            
                        },
                        labelRenderer: function () {
                            return "tab";
                        }
                    },
                    "leiden/expansion": {
                        format: "decorate",
                        className: "leiden__expansion",
                        labelRenderer: function () {
                            return "<span style='expansion'>leiden/expansion</span>";
                        }
                    },
                    "leiden/emphasis": {
                        format: "decorate",
                        className: "leiden__emphasis",
                        labelRenderer: function () {
                            return "<span style='leiden__emphasis'>leiden/emphasis</span>";
                        }
                    },
                    "leiden/sic": {
                        format: "overlay",
                        className: "leiden__sic",
                        labelRenderer: function () {
                            return "<span style='leiden__sic'>leiden/sic</span>";
                        }
                    },
                    "leiden/repetition": {
                        format: "overlay",
                        className: "leiden__repetition",
                        labelRenderer: function () {
                            return "<span style='leiden__repetition'>leiden/repetition</span>";
                        }
                    },
                    "leiden/rewritten": {
                        format: "overlay",
                        className: "leiden__rewritten",
                        labelRenderer: function () {
                            return "<span style='leiden__rewritten'>leiden/rewritten</span>";
                        }
                    },
                    "leiden/supra-lineam": {
                        format: "decorate",
                        className: "leiden__supra_lineam",
                        labelRenderer: function () {
                            return "<span style='leiden__supra_lineam'>leiden/supra-lineam</span>";
                        }
                    },
                    "leiden/marginalia": {
                        format: "decorate",
                        className: "leiden__marginalia",
                        labelRenderer: function () {
                            return "<span style='leiden__marginalia'>leiden/marginalia</span>";
                        }
                    },
                    "leiden/correction": {
                        format: "overlay",
                        className: "leiden__correction",
                        labelRenderer: function () {
                            return "<span style='leiden__correction'>leiden/correction</span>";
                        }
                    },
                    "leiden/striked-out": {
                        format: "decorate",
                        className: "leiden__striked_out",
                        labelRenderer: function () {
                            return "<span style='leiden__striked_out'>leiden/striked-out</span>";
                        }
                    },
                    "leiden/striked-out": {
                        format: "decorate",
                        className: "leiden__striked_out",
                        labelRenderer: function () {
                            return "<span style='leiden__striked_out'>leiden/striked-out</span>";
                        }
                    },
                    "leiden/commentary": {
                        format: "decorate",
                        className: "leiden__commentary",
                        labelRenderer: function () {
                            return "<span style='leiden__commentary'>leiden/commentary</span>";
                        }
                    },
                    "leiden/line": {
                        format: "decorate",
                        bracket: {
                            right: {
                                className: "expansion-bracket",
                                content: "/"
                            }
                        },
                        labelRenderer: function (prop) {
                            return "line " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value || !!_.lastLineNumber ? _.lastLineNumber + 1 : 1;
                            var num = prompt("Line number?", defaultValue);
                            if (!!num) {
                                num = _.lastLineNumber = parseInt(num);
                            }
                            process(num);
                        }
                    },
                    "alignment/indent": {
                        format: "block",
                        className: "block-indent",
                        labelRenderer: function () {
                            return "alignment (indent)";
                        }
                    },
                    "alignment/justify": {
                        format: "block",
                        className: "block-justify",
                        labelRenderer: function () {
                            return "alignment (justify)";
                        }
                    },
                    "alignment/right": {
                        format: "block",
                        className: "block-right",
                        labelRenderer: function () {
                            return "alignment (right)";
                        }
                    },
                    "alignment/center": {
                        format: "block",
                        className: "block-center",
                        labelRenderer: function () {
                            return "alignment (center)";
                        }
                    },
                    bold: {
                        format: "decorate",
                        shortcut: "b",
                        className: "bold",
                        labelRenderer: function () {
                            return "<b>bold</b>";
                        }
                    },
                    italics: {
                        format: "decorate",
                        shortcut: "i",
                        className: "italic",
                        labelRenderer: function () {
                            return "<em>italics</em>";
                        }
                    },
                    hyphen: {
                        format: "decorate",
                        zeroPoint: {
                            className: "zwa-hyphen"
                        },
                        className: "zwa-hyphen",
                        content: "-"
                    },
                    expansion: {
                        format: "decorate",
                        className: "expansion"
                    },
                    strike: {
                        format: "decorate",
                        className: "line-through"
                    },
                    underline: {
                        format: "decorate",
                        shortcut: "u",
                        className: "underline"
                    },
                    superscript: {
                        format: "decorate",
                        className: "superscript"
                    },
                    subscript: {
                        format: "decorate",
                        className: "subscript"
                    },
                    space: {
                        format: "decorate",
                        className: "space"
                    },
                    line: {
                        format: "decorate",
                        className: "line"
                    },
                    "p": {
                        format: "decorate",
                        className: "tei-p"
                    },
                    "del": {
                        format: "decorate",
                        className: "tei-del",
                        attributes: {
                            rendition: {
                                renderer: function (prop) {
                                    return "rendition [" + (prop.attributes.rendition || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var rendition = prompt("rendition?", prop.attributes.rendition);
                                    process(rendition);
                                }
                            }
                        }                        
                    },
                    "text": {
                        format: "decorate",
                        className: "tei-text",
                    },
                    "body": {
                        format: "decorate",
                        className: "tei-body",
                    },
                    "div": {
                        format: "decorate",
                        className: "tei-div",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("type?", prop.attributes.type);
                                    process(type);
                                }
                            },
                            id: {
                                renderer: function (prop) {
                                    return "id [" + (prop.attributes.id || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var id = prompt("id?", prop.attributes.id);
                                    process(id);
                                }
                            },
                            next: {
                                renderer: function (prop) {
                                    return "next [" + (prop.attributes.next || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var next = prompt("next?", prop.attributes.next);
                                    process(next);
                                }
                            },
                            n: {
                                renderer: function (prop) {
                                    return "n [" + (prop.attributes.n || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var n = prompt("n?", prop.attributes.n);
                                    process(n);
                                }
                            }
                        }
                    },
                    "pb": {
                        format: "decorate",
                        className: "tei-pb",
                    },
                    "lb": {
                        format: "decorate",
                        className: "tei-lb",
                    },
                    "note": {
                        format: "overlay",
                        className: "text",
                        labelRenderer: function (prop) {
                            return prop.isZeroPoint ? "<span class='output-text'>note<span>" : "<span class='output-text'>text<span>";
                        },
                        zeroPoint: {
                            className: "zero-text",
                            offerConversion: function (prop) {
                                return !prop.isZeroPoint;
                            },
                            selector: function (prop, process) {
                                var label = prompt("Label", prop.text);
                                process(label);
                            }
                        },  
                        attributes: {
                            place: {
                                renderer: function (prop) {
                                    return "place [" + (prop.attributes.place || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var place = prompt("place?", prop.attributes.place);
                                    process(place);
                                }
                            },
                            "ref": {
                                renderer: function (prop) {
                                    return "ref [" + (prop.attributes.ref || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("ref?", prop.attributes.ref);
                                    process(value);
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            var TextEdit = require("part/text-edit");
                            var ref = prop.attributes.ref;
                            if (ref) {
                                $.get(ref, {}, function(json) {
                                    openModalFromNode(_this.constructorData.template, {
                                        name: "TEI/del",
                                        contentAdded: function (element) {
                                            var modal = new TextEdit({
                                                template: element,
                                                editor: json
                                            });
                                            modal.applyBindings(element);
                                        }
                                    });
                                });                                
                            }                            
                        }
                    },
                    "hi": {
                        format: "decorate",
                        className: "tei-hi",
                        attributes: {
                            rendition: {
                                renderer: function (prop) {
                                    return "rendition [" + (prop.attributes.rendition || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var rendition = prompt("rendition?", prop.attributes.rendition);
                                    process(rendition);
                                }
                            },
                            hand: {
                                renderer: function (prop) {
                                    return "hand [" + (prop.attributes.hand || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var hand = prompt("hand?", prop.attributes.hand);
                                    process(hand);
                                }
                            }
                        }
                    },
                    "choice": {
                        format: "decorate",
                        className: "tei-choice",
                    },
                    "sic": {
                        format: "decorate",
                        className: "tei-sic",
                    },
                    "corr": {
                        format: "decorate",
                        className: "tei-corr",
                        attributes: {
                            resp: {
                                renderer: function (prop) {
                                    return "resp [" + (prop.attributes.resp || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var resp = prompt("resp?", prop.attributes.resp);
                                    process(resp);
                                }
                            }
                        }
                    },
                    "abbr": {
                        format: "decorate",
                        className: "tei-abbr"
                    },
                    "expan": {
                        format: "decorate",
                        className: "tei-expan",
                        resp: {
                            renderer: function (prop) {
                                return "resp [" + (prop.attributes.resp || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                            },
                            selector: function (prop, process) {
                                var resp = prompt("resp?", prop.attributes.resp);
                                process(resp);
                            }
                        }
                    },
                    "subst": {
                        format: "decorate",
                        className: "tei-subst",
                    },
                    "gap": {
                        format: "decorate",
                        className: "tei-gap",
                    },
                    "metamark": {
                        format: "decorate",
                        className: "tei-metamark",
                    },
                    "unclear": {
                        format: "decorate",
                        className: "tei-unclear",
                        attributes: {
                            resp: {
                                renderer: function (prop) {
                                    return "resp [" + (prop.attributes.resp || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var resp = prompt("resp?", prop.attributes.resp);
                                    process(resp);
                                }
                            },
                            reason: {
                                renderer: function (prop) {
                                    return "reason [" + (prop.attributes.reason || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var reason = prompt("reason?", prop.attributes.reason);
                                    process(reason);
                                }
                            },
                            cert: {
                                renderer: function (prop) {
                                    return "cert [" + (prop.attributes.cert || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var cert = prompt("cert?", prop.attributes.cert);
                                    process(cert);
                                }
                            }
                        }
                    },
                    "add": {
                        format: "decorate",
                        className: "tei-add",
                        attributes: {
                            place: {
                                renderer: function (prop) {
                                    return "place [" + (prop.attributes.place || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var place = prompt("place?", prop.attributes.place);
                                    process(place);
                                }
                            },
                            "ref": {
                                renderer: function (prop) {
                                    return "ref [" + (prop.attributes.ref || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("ref?", prop.attributes.ref);
                                    process(value);
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            var TextEdit = require("part/text-edit");
                            var ref = prop.attributes.ref;
                            if (ref) {
                                $.get(ref, {}, function(json) {
                                    openModalFromNode(_this.constructorData.template, {
                                        name: "TEI/del",
                                        contentAdded: function (element) {
                                            var modal = new TextEdit({
                                                template: element,
                                                editor: json
                                            });
                                            modal.applyBindings(element);
                                        }
                                    });
                                });                                
                            }                            
                        }
                    },
                    "tei/core/label": {
                        format: "decorate",
                        className: "tei-core-label",
                        attributes: {
                            place: {
                                renderer: function (prop) {
                                    return "place [" + (prop.attributes.place || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var place = prompt("Place?", prop.attributes.place);
                                    process(place);
                                }
                            }
                        }
                    },
                    "tei/core/name": {
                        format: "decorate",
                        className: "tei-core-name",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/core/date": {
                        format: "decorate",
                        className: "tei-core-date",
                        attributes: {
                            when: {
                                renderer: function (prop) {
                                    return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var when = prompt("When?", prop.attributes.when);
                                    process(when);
                                }
                            }
                        }
                    },
                    "tei/core/item": {
                        format: "decorate",
                        className: "tei-core-item",
                        attributes: {
                            n: {
                                renderer: function (prop) {
                                    return "n [" + (prop.attributes.n || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var n = prompt("When?", prop.attributes.n);
                                    process(n);
                                }
                            }
                        }
                    },
                    "tei/core/list": {
                        format: "decorate",
                        className: "tei-core-list",
                        attributes: {
                            rend: {
                                renderer: function (prop) {
                                    return "rend [" + (prop.attributes.rend || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var rend = prompt("rend?", prop.attributes.rend);
                                    process(rend);
                                }
                            }
                        }
                    },
                    "tei/core/measure": {
                        format: "decorate",
                        className: "tei-core-measure",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            },
                            quantity: {
                                renderer: function (prop) {
                                    return "quantity [" + (prop.attributes.quantity || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var quantity = prompt("Quantity?", prop.attributes.quantity);
                                    process(quantity);
                                }
                            },
                            unit: {
                                renderer: function (prop) {
                                    return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var unit = prompt("Unit?", prop.attributes.unit);
                                    process(unit);
                                }
                            }
                        }
                    },
                    "tei/core/num": {
                        format: "decorate",
                        className: "tei-core-num",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/core/quote": {
                        format: "decorate",
                        className: "tei-core-quote",
                        lang: {
                            renderer: function (prop) {
                                return "lang [" + (prop.attributes.lang || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                            },
                            selector: function (prop, process) {
                                var lang = prompt("Lang?", prop.attributes.lang);
                                process(lang);
                            }
                        }
                    },
                    "tei/core/said": {
                        format: "decorate",
                        className: "tei-core-said"
                    },
                    "tei/core/time": {
                        format: "decorate",
                        className: "tei-core-time",
                        attributes: {
                            when: {
                                renderer: function (prop) {
                                    return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var when = prompt("When?", prop.attributes.when);
                                    process(when);
                                }
                            }
                        }
                    },
                    "tei/core/unclear": {
                        format: "decorate",
                        className: "tei-core-unclear",
                        attributes: {
                            reason: {
                                renderer: function (prop) {
                                    return "reason [" + (prop.attributes.reason || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var reason = prompt("Reason?", prop.attributes.reason);
                                    process(reason);
                                }
                            }
                        }
                    },
                    "tei/core/unit": {
                        format: "decorate",
                        className: "tei-core-unit",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            },
                            unit: {
                                renderer: function (prop) {
                                    return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var unit = prompt("Unit?", prop.attributes.unit);
                                    process(unit);
                                }
                            }
                        }
                    },
                    "tei/namesdates/birth": {
                        format: "decorate",
                        className: "tei-namesdates-birth"
                    },
                    "tei/namesdates/forename": {
                        format: "decorate",
                        className: "tei-namesdates-forename"
                    },
                    "tei/namesdates/surname": {
                        format: "decorate",
                        className: "tei-namesdates-surname"
                    },
                    "tei/textstructure/argument": {
                        format: "decorate",
                        className: "tei-textstructure-argument"
                    },
                    "tei/textstructure/closer": {
                        format: "decorate",
                        className: "tei-textstructure-closer"
                    },
                    "tei/textstructure/dateline": {
                        format: "decorate",
                        className: "tei-textstructure-dateline"
                    },
                    "tei/textstructure/postscript": {
                        format: "decorate",
                        className: "tei-textstructure-postscript"
                    },
                    "tei/textstructure/opener": {
                        format: "decorate",
                        className: "tei-textstructure-opener"
                    },
                    "tei/textstructure/salute": {
                        format: "decorate",
                        className: "tei-textstructure-salute"
                    },
                    "tei/textstructure/signed": {
                        format: "decorate",
                        className: "tei-textstructure-signed"
                    },
                    "tei/verse/caesura": {
                        format: "decorate",
                        zeroPoint: {
                            className: "tei-verse-caesura"
                        },
                        className: "caesura",
                        content: "|"
                    },
                    "tei/verse/metDecl": {
                        format: "decorate",
                        className: "tei-verse-metDecl",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/verse/metSym": {
                        format: "decorate",
                        className: "tei-verse-metSym"
                    },
                    "tei/verse/rhyme": {
                        format: "decorate",
                        className: "tei-verse-rhyme",
                        attributes: {
                            label: {
                                renderer: function (prop) {
                                    return "label [" + (prop.attributes.label || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var label = prompt("Label?", prop.attributes.label);
                                    process(label);
                                }
                            }
                        }
                    },
                    page: {
                        format: "decorate",
                        className: "page",
                        labelRenderer: function (prop) {
                            return "page " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var num = prompt("Page number?", prop.value || "");
                            process(num);
                        }
                    },
                    paragraph: {
                        format: "decorate",
                        //className: "paragraph"
                    },
                    person: {
                        format: "overlay",
                        shortcut: "p",
                        className: "person",
                        labelRenderer: function (prop) {
                            return prop.name ? "person (" + prop.name + ")" : "person";
                        },
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Person UUID?", prop.value || "");
                            process(uuid);
                        },
                    },
                    "event": {
                        format: "overlay",
                        className: "event",
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Event UUID?", prop.value || "");
                            process(uuid);
                        },
                    },
                    "codex/text": {
                        format: "overlay",
                        shortcut: "t",
                        className: "text",
                        zeroPoint: {
                            className: "zero-text",
                            offerConversion: function (prop) {
                                return !prop.isZeroPoint;
                            },
                            selector: function (prop, process) {
                                var label = prompt("Label", prop.text);
                                process(label);
                            }
                        },
                        attributes: {
                            position: {
                                renderer: function (prop) {
                                    return "position [" + (prop.attributes.position || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var position = prompt("Position?", prop.attributes.position);
                                    process(position);
                                }
                            }
                        },
                        labelRenderer: function (prop) {
                            return prop.isZeroPoint ? "<span class='output-text'>footnote<span>" : "<span class='output-text'>text<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Text UUID?", prop.value || "");
                            process(uuid);
                        }
                    },
                    place: {
                        format: "overlay",
                        className: "place",
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Place", prop.value || "");
                            process(uuid);
                        }
                    },
                    webLink: {
                        format: "overlay",
                        className: "web-link",
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Web Link", prop.value || "");
                            process(uuid);
                        }
                    },
                    date: {
                        format: "overlay",
                        className: "date",
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Date/Time", prop.value || "");
                            process(uuid);
                        }
                    },
                    concept: {
                        format: "overlay",
                        className: "concept",
                        propertyValueSelector: function (prop, process) {
                            var uuid = prompt("Concept UUID?", prop.value || "");
                            process(uuid);
                        }
                    },
                }
            };
            this.editor = new Speedy(configuration);
            this.editor.bind({
                text: cons.editor.text || "",
                properties: cons.editor.properties || []
            });
            var monitorBar = new MonitorBar({
                monitor: this.monitor,
                monitorOptions: {
                    highlightProperties: true
                },
                monitorButton: {
                    link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                    layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                    toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                    zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                },
                propertyType: configuration.propertyType,
                commentManager: configuration.commentManager,
                css: {
                    highlight: "text-highlight"
                },
                layerAdded: this.editor.layerAdded,
                updateCurrentRanges: this.editor.updateCurrentRanges                
            });            
            this.editor.addMonitor(monitorBar);
        }
        Model.prototype.layerClicked = function (layer) {
            var selected = layer.selected();
            this.editor.setLayerVisibility(layer.name, selected);
            return true;
        };
        Model.prototype.isActiveMode = function (mode) {
            var modes = this.currentModes();
            return modes.indexOf(mode) >= 0;
        };
        Model.prototype.spaceClicked = function () {
            this.toggleAnnotation("space");
        };
        Model.prototype.pageClicked = function () {
            this.editor.createProperty("page");
        };
        Model.prototype.toggleAnnotation = function (type) {
            if (this.isActiveMode(type)) {
                this.editor.deleteAnnotation(type);
                this.currentModes.pop(type);
            } else {
                this.editor.createProperty(type);
            }
        };
        Model.prototype.hyphenClicked = function () {
            this.editor.createZeroPointProperty("hyphen");
        };
        Model.prototype.changeLineHeightClicked = function () {
            changeCss(".editor", "line-height", this.lineHeight());
        };
        Model.prototype.changeFontSizeClicked = function () {
            changeCss(".editor", "font-size", this.fontSize());
        };
        Model.prototype.changeFontFamilyClicked = function () {
            changeCss(".editor", "font-family", this.fontFamily());
        };
        Model.prototype.changeTextColourClicked = function () {
            changeCss(".editor", "color", this.textColour());
        };
        Model.prototype.changeBackgroundColourClicked = function () {
            changeCss(".editor", "background-color", this.backgroundColour());
        };
        Model.prototype.boldClicked = function () {
            this.toggleAnnotation("bold");
        };
        Model.prototype.italicsClicked = function () {
            this.toggleAnnotation("italics");
        };
        Model.prototype.strikeClicked = function () {
            this.toggleAnnotation("strike");
        };
        Model.prototype.superscriptClicked = function () {
            this.toggleAnnotation("superscript");
        };
        Model.prototype.expansionClicked = function () {
            this.toggleAnnotation("expansion");
        };
        Model.prototype.subscriptClicked = function () {
            this.toggleAnnotation("subscript");
        };
        Model.prototype.indentClicked = function () {
            this.editor.createBlockProperty("alignment/indent");
        };
        Model.prototype.justifyClicked = function () {
            this.editor.createBlockProperty("alignment/justify");
        };
        Model.prototype.rightClicked = function () {
            this.editor.createBlockProperty("alignment/right");
        };
        Model.prototype.centerClicked = function () {
            this.editor.createBlockProperty("alignment/center");
        };
        Model.prototype.underlineClicked = function () {
            this.toggleAnnotation("underline");
        };
        Model.prototype.lineClicked = function () {
            this.editor.createProperty("line");
        };
        Model.prototype.paragraphClicked = function () {
            this.editor.createProperty("paragraph");
        };
        Model.prototype.personClicked = function () {
            this.editor.createProperty("person");
        };
        Model.prototype.textClicked = function () {
            this.editor.createProperty("text");
        };
        Model.prototype.webLinkClicked = function () {
            this.editor.createProperty("webLink");
        };
        Model.prototype.eventClicked = function () {
            this.editor.createProperty("event");
        };
        Model.prototype.placeClicked = function () {
            this.editor.createProperty("place");
        };
        Model.prototype.dateClicked = function () {
            this.editor.createProperty("date");
        };
        Model.prototype.conceptClicked = function () {
            this.editor.createProperty("concept");
        };
        Model.prototype.footnoteClicked = function () {
            var content = prompt("Footnote text");
            this.editor.createZeroPointProperty("text", content);
        };
        Model.prototype.unbindClicked = function () {
            var data = this.editor.unbind();
            this.viewer(JSON.stringify(data));
        };
        Model.prototype.loadClicked = function () {
            var _this = this;
            var file = this.file();
            $.get(file, function (json) {
                var blacklist = _this.blacklist();
                if (blacklist) {
                    blacklist = blacklist.split(",").map(x => x.trim());
                    json.properties = json.properties.filter(x => blacklist.indexOf(x.type) == -1);
                }
                // var containsArabic = (file.indexOf("arabic") >= 0); // A crude temporary check. We will check for a meta-data property later.
                // if (containsArabic) {                    
                //     _this.setupEditor({
                //         container: _this.cloneNode(_this.container),
                //         // monitor: _this.cloneNode(_this.monitor),
                //         direction: "RTL",
                //         interpolateZeroWidthJoiningCharacter: true
                //     });
                // } else {
                //     _this.setupEditor({
                //         container: _this.cloneNode(_this.container),
                //         // monitor: _this.cloneNode(_this.monitor)
                //     });
                // }
                _this.setupEditor({
                    container: _this.cloneNode(_this.container),
                    // monitor: _this.cloneNode(_this.monitor)
                });
                _this.editor.bind(json);        
                _this.viewer(null);
            });
        };
        Model.prototype.cloneNode = function (node) {
            var clone = node.cloneNode(true);
            node.parentNode.replaceChild(clone, node);
            return clone;
        };
        Model.prototype.teiSelected = function () {
            var tei = this.TEI();
            this.editor.createProperty(tei);
        };
        Model.prototype.bindClicked = function () {
            var data = JSON.parse(this.viewer() || '{}');
            this.editor.bind({
                text: data.text,
                properties: data.properties
            });
        }
        return Model;
    })();

    return Model;

}));