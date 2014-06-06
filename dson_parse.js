/*
    dson_parse.js
    2014-06-06

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    This file creates a dson_parse function.

        dson_parse(text, reviver)
            This method parses a DSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = dson_parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*members "", "\"", "\/", "\\", at, b, call, charAt, f, fromCharCode,
    hasOwnProperty, message, n, name, prototype, push, r, t, text
*/

var dson_parse = (function () {
    "use strict";

// This is a function that can parse a DSON text, producing a JavaScript
// data structure. It is a simple, recursive descent parser. It does not use
// eval or regular expressions, so it can be used as a model for implementing
// a DSON parser in other languages.

// We are defining the function inside of another function to avoid creating
// global variables.

    var at,     // The index of the current character
        ch,     // The current character
        escapee = {
            '"':  '"',
            '\\': '\\',
            '/':  '/',
            b:    '\b',
            f:    '\f',
            n:    '\n',
            r:    '\r',
            t:    '\t'
        },
        text,

        error = function (m) {

// Call error when something is wrong.

            throw {
                name:    'SyntaxError',
                message: m,
                at:      at,
                text:    text
            };
        },

        next = function (c) {

// If a c parameter is provided, verify that it matches the current character.

            if (c && c !== ch) {
                error("Expected '" + c + "' instead of '" + ch + "'");
            }

// Get the next character. When there are no more characters,
// return the empty string.

            ch = text.charAt(at);
            at += 1;
            return ch;
        },

        number = function () {

// Parse a number value.

            var number,
                string = '';

            if (ch === '-') {
                string = '-';
                next('-');
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
            if (ch === '.') {
                string += '.';
                while (next() && ch >= '0' && ch <= '9') {
                    string += ch;
                }
            }
            if (ch === 'v' || ch === 'V') {
                if (ch === 'v') {
                    next('v')
                    string += ch;
                    next('e')
                    next('r')
                    next('y')
                } else {
                    next('V')
                    string += ch;
                    next('E')
                    next('R')
                    next('Y')
                }
                if (ch === '-' || ch === '+') {
                    string += ch;
                    next();
                }
                while (ch >= '0' && ch <= '9') {
                    string += ch;
                    next();
                }
            }
            number = +string;
            if (!isFinite(number)) {
                error("Bad number");
            } else {
                return number;
            }
        },

        string = function () {

// Parse a string value.

            var hex,
                i,
                string = '',
                uffff;

// When parsing for string values, we must look for " and \ characters.

            if (ch === '"') {
                while (next()) {
                    if (ch === '"') {
                        next();
                        return string;
                    }
                    if (ch === '\\') {
                        next();
                        if (ch === 'u') {
                            uffff = 0;
                            for (i = 0; i < 4; i += 1) {
                                hex = parseInt(next(), 16);
                                if (!isFinite(hex)) {
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            string += String.fromCharCode(uffff);
                        } else if (typeof escapee[ch] === 'string') {
                            string += escapee[ch];
                        } else {
                            break;
                        }
                    } else {
                        string += ch;
                    }
                }
            }
            error("Bad string");
        },

        white = function () {

// Skip whitespace.

            while (ch && ch <= ' ') {
                next();
            }
        },

        word = function () {

// true, false, or null.

            next('n');
            switch (ch) {
            case 'o':
                next('o');
                next('t');
                switch (ch) {
                case 'f':
                    next('f');
                    next('a');
                    next('l');
                    next('s');
                    next('e');
                    return true;
                case 't':
                    next('t');
                    next('r');
                    next('u');
                    next('e');
                    return false;
                }
            case 'u':
                next('u');
                next('l');
                next('l');
                next('i');
                next('s');
                next('h');
                return null;
            }
            error("Unexpected '" + ch + "'");
        },

        value,  // Place holder for the value function.

        array = function () {

// Parse an array value.

            var array = [];

            if (ch === 's') {
                next('s');
                next('o');
                white();
                if (ch === 'm') {
                    next('m');
                    next('a');
                    next('n');
                    next('y');
                    return array;   // empty array
                }
                while (ch) {
                    array.push(value());
                    white();
                    if (ch === 'm') {
                        next('m');
                        next('a');
                        next('n');
                        next('y');
                        return array;
                    }
                    next('n');
                    next('e');
                    next('x');
                    next('t');
                    white();
                }
            }
            error("Bad array");
        },

        object = function () {

// Parse an object value.

            var key,
                object = {};

            if (ch === 's') {
                next('s');
                next('u');
                next('c');
                next('h');
                white();
                if (ch === 'w') {
                    next('w');
                    next('o');
                    next('w');
                    return object;   // empty object
                }
                while (ch) {
                    key = string();
                    white();
                    next('i');
                    next('s');
                    if (Object.hasOwnProperty.call(object, key)) {
                        error('Duplicate key "' + key + '"');
                    }
                    object[key] = value();
                    white();
                    if (ch === 'w') {
                        next('w');
                        next('o');
                        next('w');
                        return object;
                    }
                    next('n');
                    next('e');
                    next('x');
                    next('t');
                    white();
                }
            }
            error("Bad object");
        };

    value = function () {

// Parse a DSON value. It could be an object, an array, a string, a number,
// or a word.

        white();
        switch (ch) {
        case 's':
            if (text.charAt(at + 1) === 'u') {
                return object();
            } else if (text.charAt(at + 1) === 'o') {
                return array();
            }
        case '"':
            return string();
        case '-':
            return number();
        default:
            return ch >= '0' && ch <= '9' ? number() : word();
        }
    };

// Return the dson_parse function. It will have access to all of the above
// functions and variables.

    return function (source, reviver) {
        var result;

        text = source;
        at = 0;
        ch = ' ';
        result = value();
        white();
        if (ch) {
            error("Syntax error");
        }

// If there is a reviver function, we recursively walk the new structure,
// passing each name/value pair to the reviver function for possible
// transformation, starting with a temporary root object that holds the result
// in an empty key. If there is not a reviver function, we simply return the
// result.

        return typeof reviver === 'function'
            ? (function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }({'': result}, ''))
            : result;
    };
}());
