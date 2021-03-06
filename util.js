/*
 * Some utilities
 */
var Plugin, exec, me, mongojs;

exec = require('child_process').exec;

mongojs = require('mongojs');

Plugin = (function() {
    function Plugin() {
        this.app = app;
    }

    return Plugin;

})();

me = module.exports = {
    extend: function(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
            var prop, results;
            if (source) {
                results = [];
                for (prop in source) {
                    results.push(obj[prop] = source[prop]);
                }
                return results;
            }
        });
        return obj;
    },
    syscall: function(command, callback, throws) {
        if (throws == null) {
            throws = true;
        }
        return exec(command, function(error, stdout, stderr) {

            /*
            #if stdout
             *  console.log "stdout: " + stdout
             */
            if (stderr && throws) {
                console.error(command);
                throw "stderr: " + stderr;
            }
            if (error && throws) {
                console.error(command);
                throw "exec error: " + error;
            }
            return typeof callback === "function" ? callback(stdout, error || stderr) : void 0;
        });
    },
    get_file_extension: function(fname) {
        return fname.substr((Math.max(0, fname.lastIndexOf(".")) || 2e308) + 1);
    },
    flash: function(req, message_type, message) {
        var base, m;
        if (message_type && message) {
            m = (base = req.session).messages != null ? base.messages : base.messages = {};
            if (m[message_type] == null) {
                m[message_type] = [];
            }
            return m[message_type].push(message);
        }
    },
    Plugin: Plugin,
    format: function(str, dict) {
        return str.replace(/\{([^\}]+)\}/g, function(match, $1) {
            return dict[$1] || '';
        });
    },
    zpad: function(num, zeros) {
        if (zeros == null) {
            zeros = 0;
        }
        num = '' + num;
        while (num.length < zeros) {
            num = '0' + num;
        }
        return num;
    },
    oid_str: function(inp) {
        return (me.oid(inp)).toString();
    },
    oid: function(inp) {
        var byte, result;
        if (inp === void 0) {
            console.error('implied.util.oid: undefined objectid');
            console.trace();
            return inp;
        }
        if (inp instanceof mongojs.ObjectId) {
            return inp;
        } else if (inp.bytes) {
            result = ((function() {
                var i, len, ref, results;
                ref = inp.bytes;
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                    byte = ref[i];
                    results.push(implied.util.zpad(byte.toString(16), 2));
                }
                return results;
            })()).join('');
            return mongojs.ObjectId(result);
        } else {
            return mongojs.ObjectId('' + inp);
        }
    },
    unique: function(array) {
        var a, i, len, val;
        a = [];
        for (i = 0, len = array.length; i < len; i++) {
            val = array[i];
            if (a.indexOf(val) === -1) {
                a.push(val);
            }
        }
        return a;
    }
};
