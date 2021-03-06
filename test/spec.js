/**
 * 太简单的就不测试了
 */
var expect = require("expect.js")
var Promise = require("../index")
var interval = 300

var PENDING = 0
var FULFILLED = 1
var REJECTED = 2

describe("new Promise", function() {
  it("should new a Promise if not use keyword new", function() {
    var promise = Promise()

    expect(promise instanceof Promise).to.be(true)
  })
})

describe("then", function() {
  it("should call then more than once", function() {
    var promise = new Promise(function(resolve, reject) {
      resolve(1)
    })

    promise.then(function(result) {
      expect(result).to.equal(1)
    })

    promise.then(function(result) {
      expect(result).to.equal(1)
    })
  })

  it("should pass the result to next promise", function(done) {
    var fun1 = function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(1)
        }, interval)
      })
    }

    var fun2 = function(val) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(1 + val)
        }, interval)
      })
    }

    var fun3 = function(val) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(val * 2)
        }, interval)
      })
    }

    var output = function(val) {
      expect(val).to.equal(4)
      done()
    }

    fun1()
      .then(fun2)
      .then(fun3)
      .then(output)
  })

  it("should be ignore if the onFulfilled or onRejected is not a function", function(done) {
    var p1 = new Promise(function(resolve) {
      resolve(1)
    })
    var p2 = p1.then(null, 5)
    p2.then(function(v) {
      expect(v).to.equal(1)
      done()
    })
  })

  it("should call the thenable", function(done) {
    var p1 = Promise.resolve(1)
    var p2 = p1.then(function() {
      return {
        then: function(resolve, reject) {
          resolve(2)
        }
      }
    })

    p2.then(function(v) {
      expect(v).to.equal(2)
    })

    p2 = p1.then(function() {
      return {
        then: function(resolve, reject) {
          reject(2)
        }
      }
    })
    p2.then(null, function(v) {
      expect(v).to.equal(2)
    })

    p2 = p1.then(function() {
      return {
        then: function(resolve, reject) {
          a.b.c()
        }
      }
    })
    p2.then(null, function(err) {
      expect(err).to.be.ok()
      done()
    })
  })

  it("should catch the err", function(done) {
    var p1 = Promise.resolve(1)
    var p2 = p1.then(function() {
      a.b.c()
    })

    p2.then(null, function() {
      expect(p2._state).to.equal(REJECTED)
      done()
    })
  })

  it("should reject if the resolve value is promise self", function(done) {
    var p1 = Promise.resolve()
    var p2 = p1.then(function() {
      return p2
    })

    p2.then(null, function() {
      expect(p2._reason instanceof TypeError).to.be.ok()
      done()
    })
  })
})

describe("state", function() {
  it("should tell is pending", function() {
    var p = new Promise(function(resolve, reject) {})
    expect(p.isPending()).to.be(true)
    expect(p.isFulfilled()).to.be(false)
    expect(p.isRejected()).to.be(false)
  })

  it("should tell is fulfilled", function() {
    var p = new Promise(function(resolve, reject) {
      resolve()
    })
    expect(p.isPending()).to.be(false)
    expect(p.isFulfilled()).to.be(true)
    expect(p.isRejected()).to.be(false)

    p.resolve()
    expect(p.isFulfilled()).to.be(true)
  })

  it("should tell is rejected", function() {
    var p = new Promise(function(resolve, reject) {
      reject()
    })
    expect(p.isPending()).to.be(false)
    expect(p.isFulfilled()).to.be(false)
    expect(p.isRejected()).to.be(true)
  })
})

describe("finally", function() {
  it("should finally call the handler", function(done) {
    var counter = 0
    var handler = function(val) {
      expect(val).to.equal(1)
      counter++
    }

    var p = Promise.resolve(1)
    p.finally(handler)

    p = Promise.reject(1)
    p.finally(handler)

    setTimeout(function() {
      expect(counter).to.equal(2)
      done()
    }, 10)
  })
})

describe("catch", function() {
  it("should catch the error finally", function(done) {
    var err = new Error()
    var fun1 = function() {
      return new Promise(function(resolve, reject) {
        reject(err)
      })
    }

    var fun2 = function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(1)
        }, interval)
      })
    }

    var fun3 = function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(2)
        }, interval)
      })
    }

    fun1()
      .then(fun2)
      .then(fun3)
      ["catch"](function(e) {
        expect(e).to.equal(err)
        done()
      })
  })
})

describe("Promise.all", function() {
  it("should get the result after the promises resolve", function() {
    var promises = [1, 2, 3].map(function(i) {
      return new Promise(function(resolve) {
        resolve(i * i)
      })
    })

    Promise.all(promises).then(function(result) {
      expect(result).to.eql([1, 4, 9])
      expect(
        promises.map(function(item) {
          return item._state
        })
      ).to.eql([1, 1, 1])
    })
  })

  it("should execute in order", function(done) {
    var result = []
    var p1 = new Promise(function(resolve) {
      setTimeout(function() {
        result.push(1)
        resolve()
      }, 100)
    })
    var p2 = new Promise(function(resolve) {
      result.push(2)
      resolve()
    })
    var p3 = new Promise(function(resolve) {
      setTimeout(function() {
        result.push(3)
        resolve()
      }, 300)
    })
    Promise.all([p1, p2, p3]).then(function() {
      expect(result).to.eql([2, 1, 3])
      done()
    })
  })

  it("should get the error if some throw error", function(done) {
    var promises = [3, 2, 1].map(function(i) {
      return new Promise(function(resolve, reject) {
        reject(i * i)
      })
    })

    Promise.all(promises).catch(function(result) {
      expect(result).to.equal(9)
      done()
    })
  })
})

describe("Promise.race", function() {
  it("should rece the promises", function(done) {
    var promises = [1, 2, 3].map(function(i) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(i * i)
        }, 100 * i)
      })
    })

    Promise.race([Promise.reject(1), Promise.resolve(2)]).then(null, function(
      err
    ) {
      expect(err).to.be(1)
    })

    Promise.race(promises).then(function(result) {
      expect(result).to.equal(1)
      done()
    })
  })
})

describe("Promise.reject", function() {
  it("should reject a value to promise", function() {
    var promise = Promise.reject(new Error())
    expect(promise instanceof Promise).to.be(true)
  })
})

describe("Promise.resolve", function() {
  it("should resolve a value to promise", function() {
    var promise = Promise.resolve()
    expect(promise instanceof Promise).to.be(true)
  })
})

describe("Promise.defer", function() {
  var defer = Promise.defer()

  expect(defer.resolve).to.be.a("function")
  expect(defer.reject).to.be.a("function")
  expect(defer.promise instanceof Promise).to.be(true)
})
