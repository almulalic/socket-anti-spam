'use strict'

var assert = require('assert')
var assert = require('assert-plus')
var clientIo = require('socket.io-client')
var io = require('socket.io').listen(3000,{ log: false })
var antiSpam = require('../antispam')

var passed = false
var passedBan = false
var disconnected = false
var times = 0
var clientSocket = clientIo.connect('http://127.0.0.1:3000',{'forceNew':true })

function repeat(){
	if(disconnected){
		times++
		if(times>=4){
			disconnected = true
			return
		}
		clientSocket = clientIo.connect('http://127.0.0.1:3000',{'forceNew':true })
		clientSocket.on("connect", function(){
			disconnected = false
		})
		clientSocket.on("reconnect", function(){
			disconnected = false
		})
		clientSocket.on("disconnect", function(){
			disconnected = true
		})
		disconnected = false
		return
	}
	clientSocket.emit('spamming', { some: 'data' })
	setTimeout(function(){ repeat() },250)
}
clientSocket.on("connect", function(){
	disconnected = false
})
clientSocket.on("reconnect", function(){
	disconnected = false
})
clientSocket.on("disconnect", function(){
	disconnected = true
})


io.sockets.on('connection', function (socket) {
	antiSpam.onConnect(socket, function(err,data){
    if(err) console.log(err)
  })
  socket.on("spamming", function() {
    socket.emit("spamscore",null)
  })
})

describe("Internal", function(){
	this.timeout(1000)
	var passedInt
	var passedInt2
	it('Connect to the webserver, spam socket.emits and get disconnect/kicked', function(done){
		var spammerino = setInterval(function(){
			repeat()
			if(!disconnected) return
			clearInterval(spammerino)
			done()
		},1)
	})
	it('Get Banned', function(done){
		var spammerino = setInterval(function(){
			repeat()
			if(!disconnected) return
			clearInterval(spammerino)
			done()
		},1)
	})
	it('Confirm ban', function(){
		var lengthy = antiSpam.getBans().length
    assert.equal(lengthy,1)
	})
	it('Get Ban list', function(){
    assert.equal(antiSpam.getBans()[0].ip,"::ffff:127.0.0.1")
	})
	it('Call init', function(){
    antiSpam.init({
      banTime: 30,            // Ban time in minutes
      kickThreshold: 2,       // User gets kicked after this many spam score
      kickTimesBeforeBan: 1   // User gets banned after this many kicks
    })
	})
	it('Call init with only banTime', function(){
    antiSpam.init({
      banTime: 30,            // Ban time in minutes
    })
	})
	it('Call init with only kickThreshold', function(){
    antiSpam.init({
      kickThreshold: 2,       // User gets kicked after this many spam score
    })
	})
	it('Call init with only kickTimesBeforeBan', function(){
    antiSpam.init({
      kickTimesBeforeBan: 1   // User gets banned after this many kicks
    })
	})
	it('Call on connect without a callback', function(){
    assert.throws(function(){
      antiSpam.onConnect("test")
    },Error)
	})
	it('Call lowerScore()', function(){
    assert.equal(antiSpam.lowerScore(),true)
	})
	it('Call lowerKickCount()', function(){
    assert.equal(antiSpam.lowerKickCount(),true)
	})
  it('unBan ip', function(){
    antiSpam.unBan("::ffff:127.0.0.1")
    assert.equal(antiSpam.getBans().length,0)
  })
  it('ban ip', function(){
    antiSpam.ban("::ffff:127.0.0.1")
    assert.equal(antiSpam.getBans()[0].ip,"::ffff:127.0.0.1")
  })
  it('ban ip for 1 minute', function(){
    antiSpam.unBan("::ffff:127.0.0.1")
    antiSpam.ban("::ffff:127.0.0.1",1)
    assert.equal(antiSpam.getBans()[0].ip,"::ffff:127.0.0.1")
  })
})
