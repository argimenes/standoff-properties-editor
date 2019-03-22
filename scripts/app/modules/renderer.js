(function (factory) {
    define("speedy/renderer", [], factory);
}(function () {

    var Renderer = (function () {
        function Renderer(data) {
            this.data = data;
        }
        Renderer.prototype.startTag = function (prop) {
            switch (prop.type) {
                case "bold": return "<b>";
                case "italics": return "<em>";
                case "strike": return "<u>";
                case "uppercase": return "<span class='uppercase'>";
                case "page": return "<hr/><span class='output-page-number'>" + prop.value + "</span>";
                case "superscript": return "<sup>";
                case "sentiment/sentence": return "<span data-type='sentiment/sentence' data-lemma='" + prop.Lemma + "'>";
                case "syntax/part-of-speech": return "<span data-type='syntax/part-of-speech' data-lemma='" + prop.Lemma + "'>";
                case "highlight": return "<span class='output-highlight'>";
                case "agent": return "<span class='output-agent' data-type='agent' data-guid='" + prop.value + "'>";
                case "claim": return "<span class='output-claim' data-type='claim' data-guid='" + prop.value + "'>";
                case "trait": return "<span class='output-trait' data-type='trait' data-guid='" + prop.value + "'>";
                case "concept": return "<span class='output-concept' data-type='concept' data-guid='" + prop.value + "'>";
                case "subject": return "<span class='output-subject' data-type='subject' data-guid='" + prop.value + "'>";
                case "text": return "<span class='output-text' data-type='text' data-guid='" + prop.value + "'>" + (prop.isZeroPoint ? prop.text : "");
                case "dataPoint": return "<span class='output-dataPoint' data-type='dataPoint' data-guid='" + prop.value + "'>";
                case "metaRelation": return "<span class='output-metaRelation' data-type='metaRelation' data-guid='" + prop.value + "'>";
                case "time": return "<span class='output-time' data-type='time' data-guid='" + prop.value + "'>";
                case "lexeme": return "<span class='output-lexeme' data-type='lexeme' data-guid='" + prop.value + "'>";
                case "syntax/tag": return "<span data-type='syntax/tag' data-lemma='" + prop.Lemma + "'>";                
                case "tei/textstructure/opener": return "<span data-type='tei/textstructure/opener'>";
                case "tei/textstructure/closer": return "<span data-type='tei/textstructure/closer'>";
                case "tei/textstructure/salute": return "<span data-type='tei/textstructure/salute'>";
                case "tei/textstructure/signed": return "<span data-type='tei/textstructure/signed'>";
                case "tei/textstructure/dateline": return "<span data-type='tei/textstructure/dateline'>";
                case "tei/core/date": return "<span data-type='tei/core/date'>";
                case "alignment/right": return "<div data-type='alignment/right' class='block-right'>";
                case "alignment/left": return "<div data-type='alignment/left' class='block-left'>";
                case "alignment/center": return "<div data-type='alignment/center' class='block-center'>";
                case "alignment/indent": return "<div data-type='alignment/indent' class='block-indent'>";
                case "alignment/justify": return "<div data-type='alignment/justify' class='block-justify'>";
                default: return "";
            }
        };
        Renderer.prototype.endTag =function (prop) {
            switch (prop.type) {
                case "bold": return "</b>";
                case "italics": return "</em>";
                case "strike": return "</u>";
                case "superscript": return "</sup>";
                case "uppercase": return "</span>";
                case "superscript": return "<sup>";
                case "sentiment/sentence": return "</span>";
                case "syntax/part-of-speech": return "</span>";
                case "highlight": return "</span>";
                case "agent": return "</span>";
                case "claim": return "</span>";
                case "trait": return "</span>";
                case "concept": return "</span>";
                case "subject": return "</span>";
                case "text": return "</span>";
                case "dataPoint": return "</span>";
                case "metaRelation": return "</span>";
                case "time": return "</span>";
                case "lexeme": return "</span>";
                case "syntax/tag": return "</span>";
                case "tei/textstructure/opener": return "</span>";
                case "tei/textstructure/closer": return "</span>";
                case "tei/textstructure/salute": return "</span>";
                case "tei/textstructure/signed": return "</span>";
                case "tei/textstructure/dateline": return "</span>";
                case "tei/core/date": return "</span>";
                case "alignment/right": return "</div>";
                case "alignment/left": return "</div>";
                case "alignment/center": return "</div>";
                case "alignment/indent": return "</div>";
                default: return "";
            }
        };
        Renderer.prototype.byAscending = function (a, b) {
            var a1 = this.propertyLength(a), b1 = this.propertyLength(b);
            return a1 > b1 ? 1 : a1 == b1 ? 0 : -1;
        };
        Renderer.prototype.byDescending = function (a, b) {
            var a1 = this.propertyLength(a), b1 = this.propertyLength(b);
            return a1 < b1 ? 1 : a1 == b1 ? 0 : -1;
        };
        Renderer.prototype.propertyLength = function (prop) {
            return this.endIndex(prop) - this.startIndex(prop);
        };
        Renderer.prototype.startIndex = function (prop) {
            return prop.startIndex || 0;
        };
        Renderer.prototype.endIndex = function (prop) {
            return prop.endIndex || prop.startIndex || 0;
        };
        Renderer.prototype.isEnd = function (prop, i) {
            return this.endIndex(prop) == i;
        };
        Renderer.prototype.isStart = function (prop, i) {
            return this.startIndex(prop) == i;
        };
        Renderer.prototype.renderToDocumentFragment = function () {
            var _this = this;
            var data = this.data;
            if (!data) {
                return null;
            }
            if (!data.text) {
                return null;
            }
            var fragment = document.createDocumentFragment();
            var result = [];
            if (!data.properties || !data.properties.length) {
                result.push(data.text);
            }
            else {
                var len = data.text.length;
                var props = data.properties.filter(x => !x.isDeleted && x.startIndex != null);
                for (var i = 0; i < len; i++) {
                    var c = data.text[i];
                    var start = props.filter(p => _this.isStart(p, i)).sort(_this.byDescending.bind(this));
                    start.forEach(p => {
                        var tag = _this.startTag(p);
                        result.push(tag);
                    });
                    if (c == '\r') {
                        result.push("<br/>");
                    } else {
                        result.push(c);
                    }
                    var end = props.filter(p => _this.isEnd(p, i)).sort(_this.byAscending.bind(this));
                    end.forEach(p => {
                        var tag = _this.endTag(p);
                        result.push(tag);
                    });
                }
            }
            var div = document.createElement("DIV");
            div.innerHTML = result.join("");
            fragment.appendChild(div);
            return fragment;
        };
        return Renderer;
    })();

    return Renderer;

}));