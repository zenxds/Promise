/**
 * Promise A+
 * https://promisesaplus.com/
 */

const PENDING = 0
const FULFILLED = 1
const REJECTED = 2

class Promise {
  constructor(executor) {
    this._state = PENDING
    this._onFulfilled = []
    this._onRejected = []
    // resolve value
    this._value = null
    // reject reason
    this._reason = null

    if (isFunction(executor)) {
      executor((...args) => {
        this.resolve(...args)
      }, (...args) => {
        this.reject(...args)
      })
    }
  }

  then(onFulfilled, onRejected) {
    const promise = new Promise()

    this._onFulfilled.push(wrapper(promise, onFulfilled, 'resolve'))
    this._onRejected.push(wrapper(promise, onRejected, 'reject'))

    this.flush()
    return promise
  }

  flush() {
    let state = this._state

    if (state === PENDING) {
      return
    }

    const fns = state === FULFILLED ? this._onFulfilled.slice() : this._onRejected.slice()
    const arg = state === FULFILLED ? this._value : this._reason

    setTimeout(function() {
      each(fns, function(fn) {
        try {
          fn(arg)
        } catch (err) {}
      })
    }, 0)

    this._onFulfilled = []
    this._onRejected = []
  }

  resolve(value) {
    if(this._state !== PENDING) {
      return
    }

    this._state = FULFILLED
    this._value = value

    this.flush()
  }

  reject(reason) {
    if (this._state !== PENDING) {
      return
    }

    this._state = REJECTED
    this._reason = reason

    this.flush()
  }

  isPending() {
    return this._state === PENDING
  }

  isFulfilled() {
    return this._state === FULFILLED
  }

  isRejected() {
    return this._state === REJECTED
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(onFinally) {
    return this.then(onFinally, onFinally)
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
    } catch (err) {
      promise.reject(err)
    }
  } else {
    promise.resolve(x)
  }
}

function wrapper(promise, fn, actionType) {
  return function(val) {
    if (isFunction(fn)) {
      try {
        let x = fn(val)
        resolve(promise, x)
      } catch (err) {
        promise.reject(err)
      }
    } else {
      // https://promisesaplus.com/#point-43
      // val is the _reason or _value of the origin promise
      promise[actionType](val)
    }
  }
}

Promise.defer = function() {
  const deferred = {}

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve
    deferred.reject = reject
  })

  return deferred
}

Promise.race = function(arr) {
  const defer = Promise.defer()

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
  const defer = Promise.defer()
  const results = []
  let length = arr.length

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

const isFunction = isType('Function')
function isType(type) {
  return function(obj) {
    return {}.toString.call(obj) == "[object " + type + "]"
  }
}

function each(arr, fn) {
  for (let i = 0; i < arr.length; i++) {
    fn(arr[i], i)
  }
}

export default Promise