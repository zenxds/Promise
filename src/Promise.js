/**
 * 一个简单Promise实现
 * Promises/A+规范：https://promisesaplus.com/ http://www.ituring.com.cn/article/66566
 *
 * 暂时不支持onFulfilled return then对象，不支持resolve thenable对象
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

Promise.prototype = {
    constructor: Promise,

    then: function(onFulfilled, onRejected) {
        // 返回一个新promise
        var promise = new Promise()

        var onFulfilledWrapper = function(value) {
            if (isFunction(onFulfilled)) {
                try {
                    var ret = onFulfilled(value)
                    // return thenable
                    if (isThenable(ret)) {
                        ret.then(function(val) {
                            promise.resolve(val)
                        }, function(reason) {
                            promise.reject(reason)
                        })
                    } else {
                        // return同步值
                        promise.resolve(ret)
                    }
                } catch (e) {
                    promise.reject(e)
                }
            } else {
                promise.resolve(value)
            }
        }
        var onRejectedWrapper = function(reason) {
            if (isFunction(onRejected)) {
                try {
                    promise.resolve(onRejected(reason))
                } catch (e) {
                    promise.reject(e)
                }
            } else {
                promise.reject(reason)
            }
        }

        if (this._state === FULFILLED) {
            onFulfilledWrapper(this._value)
        } else if (this._state === REJECTED) {
            onRejectedWrapper(this._reason)
        } else {
            this._onFulfilled.push(onFulfilledWrapper)
            this._onRejected.push(onRejectedWrapper)
        }

        return promise
    },

    resolve: function(value) {
        if (this._state !== PENDING) {
            return
        }

        this._state = FULFILLED
        this._value = value

        each(this._onFulfilled, function(onFulfilled) {
            onFulfilled(value)
        })
    },

    reject: function(reason) {
        if (this._state !== PENDING) {
            return
        }

        this._state = REJECTED
        this._reason = reason

        each(this._onRejected, function(onRejected) {
            onRejected(reason)
        })
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