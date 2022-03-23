const SSE = require('express-sse') //Server-side events
const events = require('events')

const STREAM = new SSE()

const emitter = new events.EventEmitter()

exports.eventStream = (req, res) => {
    console.log('Nueva conexion SSE ...')
    STREAM.init(req, res)
}

exports.start = () => {

    emitter.on('new-issuing', data => {
        STREAM.send(JSON.stringify(data), 'new-issuing')
    })
    emitter.on('new-donor', data => {
        STREAM.send(JSON.stringify(data), 'new-donor')
    })
    emitter.on('new-wish', data => {
        STREAM.send(JSON.stringify(data), 'new-wish')
    })


}

exports.emitter = emitter
exports.STREAM = STREAM
