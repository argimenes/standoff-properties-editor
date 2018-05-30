define(["jquery", "knockout"], function ($, ko) {
    var Utils = {};

    String.prototype.fmt = function (hash) {
        var string = this, key;
        for (key in hash) string = string.replace(new RegExp('\\{' + key + '\\}', 'gm'), hash[key]);
        return string
    };

    var type = function (value, expected) {
        return (typeof value).toLowerCase() == expected.toLowerCase();
    };
    var defined = Utils.defined = function (value) {
        return false == type(value, "undefined");
    };
    var unull = Utils.unull = function (value) {
        return type(value, "undefined") || null == value;
    };
    var distinct = Utils.distinct = function (list) {
        var results = [];
        each(list, function (item) {
            if (results.indexOf(item) == -1) {
                results.push(item);
            }
        });
        return results;
    };
    var fetch = Utils.fetch = function (func, defaultValue) {
        try {
            return func();
        } catch (e) {
            return defaultValue;
        }
    };
    /**
    * Splits the @list up into groups of @radix.
    * Ex.1. group([1, 2, 3, 4, 5, 6], 2) => [[1, 2], [3, 4], [5, 6]]
    * Ex.2. group([1, 2, 3, 4, 5, 6], 3) => [[1, 2, 3], [4, 5, 6]]
    * Ex.2. group([1, 2, 3, 4, 5], 3)    => [[1, 2, 3], [4, 5]]
    */
    var group = Utils.group = function (list, radix) {
        var tuple = [];
        return zip(list, [], function (accum, value, __, index) {
            tuple.push(value);
            if (0 == (index + 1) % radix || (list.length - 1) == index) {
                if (tuple.length > 0) {
                    accum.push(tuple);
                }
                tuple = [];
            }
        }, this);
    };
    var camelCase = Utils.camelCase = function (obj) {
        return zip(obj, {}, function (accum, value, key) {
            if (key.length == 0) {
                accum[""] = value;
                return;
            }
            if (key.length == 1) {
                accum[key.toLowerCase()] = value;
                return;
            }
            var key2 = key[0].toLowerCase() + key.substr(1);
            accum[key2] = value;
        });
    };
    /**
    * Splits the @list up into @cols groups (e.g., dividing a 'row' into columns).
    * Ex.1 columns([1, 2, 3, 4, 5, 6, 7, 8], 2) => [[1, 2, 3, 4], [5, 6, 7, 8]]
    * Ex.1 columns([1, 2, 3, 4, 5, 6, 7], 2)    => [[1, 2, 3, 4], [5, 6, 7]]
    */
    var columns = Utils.columns = function (list, cols) {
        var radix = Math.ceil(unwrap(list).length / cols);
        return group(list, radix < 1 ? 1 : radix);
    };
    var istr = Utils.istr = function (value) {
        return type(value, 'string');
    };
    var isnum = Utils.isnum = function (value) {
        return type(value, 'number');
    };
    var isarr = Utils.isarr = function (value) {
        return value instanceof Array;
    };
    var isobj = Utils.isobj = function (value) {
        return type(value, 'object') && false == isarr(value);
    };
    var isfun = Utils.isfun = function (value) {
        return false == unull(value) && type(value, 'function');
    };
    var is$ = Utils.is$ = function (value) {
        return type(value, 'jquery');
    };
    var qs = Utils.qs = function (params) {
        var items = selectToArray(params, function (value, key) {
            return "{key}={value}".fmt({ key: key, value: encodeURIComponent(value) });
        }).join("&");
        return items;
    };
    //Object.prototype.toQueryString = function () {
    //    return qs(this);
    //};
    var usingKO = !Utils.unull(window.ko);
    var using$ = !Utils.unull(window.$);
    var unwrap = function (value) {
        return usingKO ? ko.utils.unwrapObservable(value) : value;
    };
    var toFormCollection = Utils.toFormCollection = function (params, collectionName) {
        var obj = {};
        each(params, function (item, index) {
            if (isobj(item)) {
                for (var key in item) {
                    obj["[" + index + "]." + key] = item[key];
                }
            }
            else {
                obj["[" + index + "]." + collectionName] = item;                
            }
        });
        return obj;
    };
    var toFormData = Utils.toFormData = function (params) {
        var formData = new FormData();
        for (var key in params) {
            var value = params[key];
            if (unull(value)) {
                // Skip over null entries as the MVC model binder will reject form value-pairs that are passed in as the string 'null'
                // No validation errors are triggered for nullable fields, though, if the value-pair is not passed in.
                continue;                
            }
            formData.append(key, value);
        }
        return formData;
    };
    var __extends = Utils.__extends = this.__extends || function (d, b) {
        for (var p in b) {
            if (b.hasOwnProperty(p)) d[p] = b[p];
        }
        function __() {
            this.constructor = d;
        }
        __.prototype = b.prototype;
        d.prototype = new __();
    };
    var each = Utils.each = function (thing, mutator) {
        return zip(thing, null, function (__, value, key, index) {
            return mutator(value, key, index);
        });
    };
    var any = Utils.any = function (thing, evaluator) {
        return false == unull(find(thing, evaluator));
    };
    var all = Utils.all = function (thing, evaluator) {
        reduce(thing, true, function (accum, value, key, index) {
            return (accum = accum && evaluator(value, key, index));
        });
    };
    var log = Utils.log = function () {
        var msg = [];
        for (var _i = 0; _i < (arguments.length - 0) ; _i++) {
            msg[_i] = arguments[_i + 0];
        }
        if (console && console.log) {
            each(msg, function (x) {
                return console.log(x);
            });
        }
    };
    var nofun = Utils.nofun = function (obj) {
        return where(obj, function (value) {
            return false == isfun(value);
        });
    };
    var uncirculate = function (value, parents) {
        if ("undefined" === typeof parents) {
            parents = [];
        }
        return contains(parents, value) ? nofun(value) : clone(value, parents.concat([value]));
    };
    Utils.decirculate = function (entity) {
        return zip(entity, {}, function (accum, value, key, index) {
            if (isobj(value["!"])) {
                accum["!"] = value["!"]["!"] + value["!"]["&"];
            }
            accum[key] = Utils.isarr(value) ? Utils.zip(value, [], function (a, v) {
                a.push(Utils.decirculate(v));
                return a;
            }) : Utils.isobj(value) ? Utils.decirculate(v) : value;
        });
    };
    Utils.matchHeightSmaller = function (s1, s2) {
        var $left = $(s1);
        var $right = $(s2);
        var rightHeight = $right.height();
        var leftHeight = $left.height();
        if (rightHeight > leftHeight) {
            $right.css("height", leftHeight);
            $right.css("max-height", leftHeight);
            $right.css("overflow-x", "hidden");
            $right.css("overflow-y", "scroll");
        }
    };

    /**
    Recursively clones any @thing. Drops functions.
    */
    var clone = Utils.clone = function (thing, parents) {
        if ("undefined" === typeof parents) {
            parents = [];
        }
        return isarr(thing) ? zip(thing, [], function (accum, value) {
            if (false == isfun(value)) accum.push(value);  // accum.push(uncirculate(value, parents));
        }) : isobj(thing) ? zip(thing, {}, function (accum, value, key) {
            if (false == isfun(value)) accum[key] = value; // accum[key] = uncirculate(value, parents);
        }) : thing;
    };

    /**
    Removes the items satisfying the evaluator from some @thing.
    */
    Utils.remove = function (thing, evaluator) {
        return (thing = not(thing, evaluator));
    };

    /**
    Returns an array of the keys on the @obj.
    */
    var keys = Utils.keys = function (obj) {
        return zip(obj, [], function (accum, __, key) {
            accum.push(key);
            return accum;
        });
    };

    /**
    Returns an array of the values on the @obj.
    */
    var values = Utils.values = function (obj) {
        return zip(obj, [], function (accum, value) {
            return accum.push(value);
        });
    };

    /**
    Flattens an N-dimensional array into a single-dimension array.
    */
    var flatten = Utils.flatten = function (arr) {
        return zip(arr, [], function (accum, value) {
            if (isarr(value)) {
                accum.concat(Utils.flatten(value));
                return accum;
            }
            else {
                accum.push(value);
            }
        });
    };

    /**
    Returns the first item from some @thing; or NULL.
    */
    var first = Utils.first = function (thing) {
        return element(thing, function () {
            return 0;
        });
    };

    /**
    Returns the second item from some @thing; or NULL.
    */
    var second = Utils.second = function (thing) {
        return element(thing, function () {
            return 1;
        });
    };

    /**
    Returns the last item from some @thing; or NULL.
    */
    var last = Utils.last = function (thing) {
        return element(thing, function (arr) {
            return arr.length - 1;
        });
    };
    var find = Utils.find = function (thing, evaluator) {
        return element(where(thing, evaluator), function () {
            return 0;
        });
    };
    var element = Utils.element = function (thing, indexer) {
        var arr = arrayify(thing), len = arr.length, index;
        try {
            index = indexer(arr);
        } catch (ex) {
        }
        return len == 0 || index < 0 || index >= len ? null : arr[index];
    };
    var is$$ = function (value) {
        return using$ && Utils.is$(value);
    };

    /**
    Converts any @thing into an array.
    */
    var arrayify = Utils.arrayify = function (_thing) {
        var thing = unwrap(_thing);
        return isarr(thing) ? thing : Utils.unull(thing) ? [] : Utils.isobj(thing) || is$$(thing) ? Utils.zip(thing, [], function (accum, value) {
            accum.push(value);
            return accum;
        }) : [thing];
    };

    /**
    Returns those items that DO NOT match the @evaluator.
    */
    var not = Utils.not = function (thing, evaluator) {
        return where(thing, function (value, key, index) {
            return !evaluator(value, key, index);
        });
    };
    var where = Utils.where = function (_thing, evaluator) {
        if ("undefined" === typeof evaluator) {
            evaluator = function (value) {
                return value;
            };
        }
        var mutator = mutate(_thing);
        return zip(_thing, seed(unwrap(_thing)), function (accum, value, key, index) {
            if (evaluator(value, key, index)) {
                return mutator(accum, value, key);
            }
        });
    };
    var size = function (thing) {
        return unull(thing) ? 0 : isarr(thing) || istr(thing) ? thing.length : isobj(thing) ? zip(thing, 0, function (a) {
            return ++a;
        }) : 0;
    };

    /**
    Returns the total number of items on some @thing.
    */
    var count = Utils.count = function (thing, evaluator) {
        return size(where(thing, evaluator));
    };

    /**
    Returns items from some @thing as nominated by the @selector.
    
    Ex.1
    select([ 1, 2, 3, 4 ], value => value * 2) --> [ 2, 4, 6, 8 ]
    
    Ex.2
    select([{ first: "Jack", last: "Bauer" }, { first: "Tony", last: "Almeida" },
    person => person.first) --> [ "Jack", "Tony" ]
    
    Ex.3
    select({ a: 1, b: 2, c: 3, d: 4 }, (value, key, index) => new Object(key + index, value * 2))
    --> { a1: 2, b2: 4, c3: 6, d4: 8 }
    */
    var select = Utils.select = function (_thing, selector) {
        var thing = unwrap(_thing), mutator = mutate(thing);
        return zip(_thing, seed(thing), function (accum, value, key, index) {
            var selected = selector(value, key, index);
            if (false == unull(selected)) {
                return mutator(accum, selected, key);
            }
        });
    };
    var selectToArray = Utils.selectToArray = function (_thing, selector) {
        var thing = unwrap(_thing), mutator = mutate([]);
        return zip(_thing, [], function (accum, value, key, index) {
            var selected = selector(value, key, index);
            if (false == unull(selected)) {
                return mutator(accum, selected, key);
            }
        });
    };
    /**
    Returns @obj without the @fieldname.
    */
    Utils.drop = function (obj) {
        var fieldnames = [];
        for (var _i = 0; _i < (arguments.length - 1) ; _i++) {
            fieldnames[_i] = arguments[_i + 1];
        }
        return each(fieldnames, function (fieldname) {
            return not(obj, function (__, key) {
                return fieldname == key;
            });
        });
    };

    /**
    Indicates whether there are any items on some @thing.
    */
    var no = Utils.no = function (thing) {
        return 0 == count(thing);
    };

    /**
    Provides the appropriate seed value for the type of @thing.
    */
    var seed = function (thing) {
        return isobj(thing) ? {} : isarr(thing) ? [] : istr(thing) ? "" : isnum(thing) ? 0 : thing;
    };

    /**
    Provides the appropriate mutator function for the type of @thing.
    */
    var mutate = function (thing) {
        return Utils.isobj(thing) ? function (accum, value, key) {
            accum[key] = value;
            return accum;
        } : Utils.isarr(thing) ? function (accum, value) {
            accum.push(value);
            return accum;
        } : Utils.istr(thing) || Utils.isnum(thing) ? function (accum, value) {
            return accum + value;
        } : function (accum, value) {
            return accum = value;
        };
    };

    /**
    Applies the @mutator to every element of some @_thing, rolling up the values into
    the @accum(ulator) and returning it.
    
    To return out of the iterator early just return an explicit FALSE.
    
    This is a general purpose abstraction that loops over arrays, objects,
    KnockoutObservableArrays, and jQuery collections.
    
    It abstracts out the collection-iterating behaviour that used to be re-implemented
    in the main LINQ methods (EACH, WHERE, SELECT).
    */
    var zip = Utils.zip = function (_thing, accum, mutator) {
        var thing = unwrap(_thing), i = 0;
        if (Utils.unull(thing) || !Utils.isfun(mutator))
            return accum;
        if (Utils.isobj(thing) || Utils.istr(thing)) {
            var name;
            for (name in thing) {
                var mutated = mutator(accum, thing[name], name, i++);
                if (mutated === false) {
                    return accum;
                }
                if (!type(mutated, "undefined"))
                    accum = mutated;
            }
        } else if (Utils.isarr(thing)) {
            var len = thing.length;
            for (; i < len; i++) {
                var mutated = mutator(accum, thing[i], i.toString(), i);
                if (mutated === false) {
                    return accum;
                }
                if (!type(mutated, "undefined"))
                    accum = mutated;
            }
        } else if (is$$(thing)) {
            $.each(thing, function (index, value) {
                return mutator(accum, value, index.toString(), index);
            });
            return accum;
        } else {
            // Some unanticipated collection type.
        }
        return accum;
    };

    /**
    Generates a range of values between the @min and @max, fed through the @generator
    if one is provided.
    
    Ex.1
    range(1,10) --> [1,2,3,4,5,6,7,8,9,10]
    
    Ex.2
    var days = range(1, 30, dd => new Day(dd)); 		// { text: "1", value: "1" }, etc.
    var months = range(1, 12, mm => new Month(mm));
    var years = range(currentYear - totalYears, currentYear, yyyy => new Year(yyyy));
    */
    Utils.range = function (min, max, generator) {
        if (typeof generator === "undefined") {
            generator = function (x) {
                return x;
            };
        }
        for (var results = [], i = min; i <= max; results.push(generator(i++)))
            ;
        return results;
    };

    /**
    Intended for scalar operations over collections -- e.g., to sum over a list
    you would write:
    
    var sum = list => reduce(list, 0, (accum, value) => accum += value);
    sum([1,2,3,4,5]) --> 15
    
    */
    var reduce = Utils.reduce = function (thing, seed, reducer) {
        Utils.zip(thing, seed, function (accum, value, key, index) {
            return reducer(accum, value, key, index);
        });
        return seed;
    };

    /* export var merge = (a, b) => {
    a = a || {};
    each(b, (value, key) => a[key] = value);
    return a;
    } */
    Utils.merge = function (first) {
        var rest = [];
        for (var _i = 0; _i < (arguments.length - 1) ; _i++) {
            rest[_i] = arguments[_i + 1];
        }
        first = Utils.clone(first || {});
        each(rest, function (item) {
            each(item, function (value, key) {
                first[key] = value;
            });
        });
        return first;
    };
    Utils.copyTo = function (main) {
        var rest = [];
        for (var _i = 0; _i < (arguments.length - 1) ; _i++) {
            rest[_i] = arguments[_i + 1];
        }
        Utils.each(rest, function (item) {
            return Utils.each(item, function (value, key) {
                return main[key] = value;
            });
        });
        return main;
    };
    var contains = Utils.contains = function (list, item) {
        if (Utils.isarr(list) && list.length === 0)
            return false;
        return !Utils.unull(Utils.find(list, function (value) {
            return value == item;
        }));
    };
    Utils.compare = function (source, target, parents) {
        if (typeof parents === "undefined") { parents = []; }
        return Utils.zip(source.facts, {}, function (result, sourceValue) {
            var sourceKey = sourceValue["!"];
            result.facts = result.facts || [];
            if (Utils.contains(parents, sourceValue)) {
                return;
            }
            var matching = Utils.first(Utils.where(target.facts, function (value) {
                return sourceKey == value["!"];
            }));
            if (!matching) {
                return;
            }
            if (!Utils.isobj(sourceValue) && !Utils.isobj(matching)) {
                if (sourceValue == matching)
                    result[sourceKey] = matching;
                return;
            }
            var results = Utils.compare(sourceValue, matching, parents.concat([sourceValue]));
            results.facts = results.facts || [];
            if (results.facts.length == 0) {
                return;
            }
            result[sourceKey] = results;
            result[sourceKey].__source__ = sourceValue;
            result[sourceKey].__target__ = matching;
        });

    };
    Utils.renderDate = function (action) {
        var result = [];
        window.lang = window.lang || "en";
        if (action.onDate) {
            if (action.onDate.prox && action.onDate.prox.length > 0 && action.onDate.prox != "c") {
                var prox = action.onDate.prox == ">" ? (lang == "fr" ? "après" : "after") :
                            action.onDate.prox == "<" ? (lang == "fr" ? "avant" : "before") :
                            action.onDate.prox == ">=" ? (lang == "fr" ? "le ou après le" : "on or after") :
                            action.onDate.prox == "<=" ? (lang == "fr" ? "le ou avant le" : "on or before")
                                                                : action.onDate.prox;
                result.push(prox);
                if (action.onDate.day) result.push(action.onDate.day + (lang == "fr" ? " de" : " of"));
                if (action.onDate.month) result.push(months[action.onDate.month - 1] + ",");
                if (action.onDate.year) result.push("<a href='#' onclick='render(Utils.dateWithin(" + action.onDate.year + "))'>" + action.onDate.year + "</a>");
                return result;
            }
            if (action.onDate.day && action.onDate.month && action.onDate.year) {
                result.push((lang == "fr" ? "sur" : "on"));
            }
            else {
                result.push((lang == "fr" ? "dans" : "in"));
            }
            var prox = action.onDate.prox == "c" ? "c." : "";
            if (action.onDate.prox) result.push(prox);
            if (action.onDate.day) result.push(action.onDate.day + (lang == "fr" ? " de" : " of"));
            if (action.onDate.month) result.push(months[action.onDate.month - 1] + ",");
            // if (action.onDate.year) result.push(action.onDate.year);
            if (action.onDate.year) result.push("<a href='#' onclick='render(Utils.dateWithin(" + action.onDate.year + "))'>" + action.onDate.year + "</a>");
        }
        if (action.fromDate) {
            result.push("from");
            var prox = !action.fromDate.prox ? "" :
                action.fromDate.prox == "c" ? "c." :
                action.fromDate.prox == ">" ? (lang == "fr" ? "après" : "after") :
                action.fromDate.prox == ">=" ? (lang == "fr" ? "le ou après le" : "on or after")
                                                    : action.fromDate.prox;
            if (action.fromDate.prox) result.push(prox);
            if (action.fromDate.day) result.push(action.fromDate.day + " of");
            if (action.fromDate.month) result.push(months[action.fromDate.month - 1] + ",");
            // if (action.fromDate.year) result.push(action.fromDate.year);
            if (action.fromDate.year) result.push("<a href='#' onclick='render(Utils.dateWithin(" + action.fromDate.year + "))'>" + action.fromDate.year + "</a>");
        }
        if (action.toDate) {
            result.push("to");
            var prox = !action.toDate.prox ? "" :
                action.toDate.prox == "c" ? "c." :
                action.toDate.prox == ">" ? "after" :
                action.toDate.prox == ">=" ? "on or after"
                                                    : action.toDate.prox;
            if (action.toDate.prox) result.push(prox);
            if (action.toDate.day) result.push(action.toDate.day + " of");
            if (action.toDate.month) result.push(months[action.toDate.month - 1] + ",");
            // if (action.toDate.year) result.push(action.toDate.year);
            if (action.toDate.year) result.push("<a href='#' onclick='render(Utils.dateWithin(" + action.toDate.year + "))'>" + action.toDate.year + "</a>");

        }
        if (action.toDate && action.fromDate) {
            if (action.toDate.year && action.fromDate.year) {
                var diff = action.toDate.year - action.fromDate.year;
                result.push("({diff} {years})".fmt({ diff: diff, years: diff == 1 ? "year" : "years" }));
            }
        }
        return result;
    };
    Utils.dateWithin = function (year) {

        var dates = Utils.where(Facts, function (fact) { return fact.onDate || fact.fromDate || fact.toDate });
        var matches = Utils.where(dates, function (fact) {
            if (fact.onDate) {
                return fact.onDate.year == year;
            }
            if (fact.fromDate && fact.toDate) {
                return fact.fromDate.year <= year && fact.toDate.year >= year;
            }
        });
        return matches;
    };

    Utils.getEntityById = function (id) {
        return Utils.indexOf(Entities, function (entity) { return entity["&"] == id });
    };
    Utils.indexOf = function (list, predicate) {
        var result;
        Utils.each(list, function (value, key, index) {
            if (predicate(value, key, index)) {
                result = index;
                return false;
            }
        });
        return result;
    };
    Utils.entityLink = function (entity) {
        return "<a href='#' onclick='render(Entities[" + entity["&"] + "])'>" + wrap(entity).getName() + "</a>"
    };
    var PubSub = (function () {
        function PubSub() {
            this.events = {};
        }
        PubSub.prototype.subscribe = function (eventName, handler, context) {
            if (!this.events[eventName]) {
                this.events[eventName] = [];
            }
            this.events[eventName].push({ context: context, handler: handler });
        };
        PubSub.prototype.publish = function (eventName) {
            if (!this.events[eventName]) {
                return;
            }
            var rest = Array.prototype.slice.call(arguments, 1);
            Utils.each(this.events[eventName], function (subscriber) {
                try {
                    subscriber.handler.call(subscriber.context, rest);
                } catch (ex) {
                    log({
                        eventName: eventName,
                        exception: ex,
                        subscriber: subscriber
                    });
                }
            });
        };
        return PubSub;
    })();
    Utils.PubSub = PubSub;
    var Events = {};
    var receive = Utils.receive = function (eventName, handler, context) {
        if (!Events[eventName]) { Events[eventName] = []; }
        Events[eventName].push({ handler: handler, context: context || arguments.callee.caller });
    };
    var broadcast = Utils.broadcast = function (eventName) {
        var eventArgs = Array.prototype.slice.call(arguments, 1);
        if (!Events[eventName]) { return; }
        each(Events[eventName], function (subscriber) {
            try {
                subscriber.handler.apply(subscriber.context, eventArgs);
            } catch (ex) {
                log({ message: "Error on trying to invoke {event} event.".fmt({ event: eventName }), exception: ex });
            }
        });
    };

    var ajax = Utils.Ajax = {
        time: function () {
            var now = new Date();
            return "{hh}:{mm}:{ss} - ".fmt({ hh: now.getHours(), mm: now.getMinutes(), ss: now.getSeconds() });
        },
        get: function (url, data, success, context) {
            var _this = this;
            var start = new Date();
            $.get(url, data, function (response) {
                var latency = (new Date() - start) / 1000;
                console.log(_this.time() + "SUCCESS - GET: " + url, { "__latency": latency + " seconds", data: data, response: response });
                if (success) {
                    if (context) {
                        success.call(context, response);
                    }
                    else {
                        success(response);
                    }
                }
            });
        },
        post: function (url, data, success, context) {
            var _this = this;
            var start = new Date();
            $.post(url, data, function (response) {
                var latency = (new Date() - start) / 1000;
                console.log(_this.time() + "SUCCESS - POST: " + url, { "__latency": latency + " seconds", data: data, response: response });
                if (success) {
                    if (context) {
                        success.call(context, response);
                    }
                    else {
                        success(response);
                    }
                }
            });
        }
    };

    return Utils;
});