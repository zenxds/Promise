/**
 * Promise A+
 * https://promisesaplus.com/
 */

var PENDING = 0
var FULFILLED = 1
var REJECTED = 2

function Promise(executor) {
    if (!(this instanceof Promise)) {
        return new Promise(executor)
    }

    this._state = PENDING
    this._onFulfilled = []
    this._onRejected = []
    // resolve value
    this._value = null
    // reject reason
    this._reason = null

    if (isFunction(executor)) {
        executor(bind(this.resolve, this), bind(this.reject, this))
    }
}

/**
 * resolve a promise with value x
 * https://promisesaplus.com/#point-47
 */
function resolve(promise, x) {
    if (promise === x) {
        promise.reject(new TypeError('A promise cannot be resolved with itself.'))
        return
    }

    if (isThenable(x)) {
        try {
            x.then(function(value) {
                resolve(promise, value)
            }, function(reason) {
                promise.reject(reason)
            })
        } catch (e) {
            promise.reject(e)
        }
    } else {
        promise.resolve(x)
    }
}

function wrapper(promise, fn, actionType) {
    return function(val) {
        if (isFunction(fn)) {
            try {
                var x = fn(val)
                resolve(promise, x)
            } catch (e) {
                promise.reject(e)
            }
        } else {
            // https://promisesaplus.com/#point-43
            // val is the _reason or _value of the origin promise
            promise[actionType](val)
        }
    }
}

Promise.prototype = {
    constructor: Promise,

    then: function(onFulfilled, onRejected) {
        var promise = new Promise()

        this._onFulfilled.push(wrapper(promise, onFulfilled, 'resolve'))
        this._onRejected.push(wrapper(promise, onRejected, 'reject'))

        this.flush()
        return promise
    },

    flush: function() {
        var state = this._state

        if (state === PENDING) {
            return
        }

        var fns = state === FULFILLED ? this._onFulfilled.slice() : this._onRejected.slice()
        var arg = state === FULFILLED ? this._value : this._reason

        setTimeout(function() {
            each(fns, function(fn) {
                try {
                    fn(arg)
                } catch (e) {}
            })
        }, 0)


        this._onFulfilled = []
        this._onRejected = []
    },

    resolve: function(value) {
        if (this._state !== PENDING) {
            return
        }

        this._state = FULFILLED
        this._value = value

        this.flush()
    },

    reject: function(reason) {
        if (this._state !== PENDING) {
            return
        }

        this._state = REJECTED
        this._reason = reason

        this.flush()
    },

    isPending: function() {
        return this._state === PENDING
    },

    isFulfilled: function() {
        return this._state === FULFILLED
    },

    isRejected: function() {
        return this._state === REJECTED
    },

    'catch': function(onRejected) {
        return this.then(null, onRejected)
    },

    always: function(onAlways) {
        return this.then(onAlways, onAlways)
    }
}

Promise.defer = function() {
    var deferred = {}

    deferred.promise = new Promise(function(resolve, reject) {
        deferred.resolve = resolve
        deferred.reject = reject
    })

    return deferred
}

Promise.race = function(arr) {
    var defer = Promise.defer()
    var len = arr.length
    var results = []

    each(arr, function(promise) {
        promise.then(function(value) {
            defer.resolve(value)
        }, function(reason) {
            defer.reject(reason)
        })
    })
    return defer.promise
}

Promise.all = function(arr) {
    var defer = Promise.defer()
    var length = arr.length
    var results = []

    each(arr, function(promise, i) {
        promise.then(function(value) {
            results[i] = value
            length--

            if (length === 0) {
                defer.resolve(results)
            }
        }, function(reason) {
            defer.reject(reason)
        })
    })
    return defer.promise
}

Promise.resolve = function(value) {
    return new Promise(function(resolve) {
        resolve(value)
    })
}

Promise.reject = function(reason) {
    return new Promise(function(resolve, reject) {
        reject(reason)
    })
}

function isThenable(val) {
    return val && isFunction(val.then)
}

function bind(fn, context) {
    var slice = [].slice
    var args = slice.call(arguments, 2)
    var noop = function() {}
    var ret = function() {
        return fn.apply(this instanceof noop ? this : context, args.concat(slice.call(arguments)))
    }

    noop.prototype = fn.prototype
    ret.prototype = new noop()
    return ret
}

var isFunction = isType('Function')
function isType(type) {
    return function(obj) {
        return {}.toString.call(obj) == "[object " + type + "]"
    }
}

function each(arr, fn) {
    var i = 0
    var length = arr.length

    for (; i < length; i++) {
        fn(arr[i], i)
    }
}

module.exports = Promise