// @ts-check

import * as Y from 'yjs'
import P2PT from '../p2pt/dist/p2pt.umd.js'
import * as encoding from '../y-webrtc/node_modules/lib0/encoding.js'
import * as decoding from '../y-webrtc/node_modules/lib0/decoding.js'
import * as math from '../y-webrtc/node_modules/lib0/math.js'
import * as random from '../y-webrtc/node_modules/lib0/random.js'
import * as awarenessProtocol from '../y-webrtc/node_modules/y-protocols/awareness.js'
import * as syncProtocol from '../y-webrtc/node_modules/y-protocols/sync.js'

/**
 * stats
 *
 * @typedef {{
      connected: number,
      total: number
    }} stats
 */

/**
 * messageType
 *
 * @typedef {0|1|3|4|'messageSync'|'messageAwareness'|'messageQueryAwareness'|'messageBcPeerId'|false} messageType
 */

/**
 * P2ptProvider
 * https://github.com/subins2000/p2pt/blob/master/api-docs.md
 *
 * @export
 * @function Peer
 * @param {any} init
 * @return {any}
 */
export class P2ptProvider {
  constructor (
    roomName,
    doc,
    {
      signaling = ['https://cdn.jsdelivr.net/gh/ngosang/trackerslist@master/trackers_all_ws.txt', 'wss://tracker.openwebtorrent.com', 'wss://tracker.sloppyta.co:443/', 'wss://tracker.novage.com.ua:443/', 'wss://tracker.btorrent.xyz:443/'],
      awareness = new awarenessProtocol.Awareness(doc),
    } = {}
  ) {
    this.doc = doc
    this.awareness = awareness
    this._peers = []
    /** @type {stats} */
    this._trackerStats = {
      'connected': 0,
      'total': 0
    }

    console.log('constructor', {roomName, doc, signaling, awarenessProtocol, Y, syncProtocol, decoding, encoding, math, random})
    // https://github.com/subins2000/p2pt/blob/master/api-docs.md#new-p2ptannounceurls---identifierstring--
    // TODO: start p2pt
    // https://github.com/yjs.js/y-webrtc/blob/6460662715a89b4c70b88f4dad16676f736e2498/src/y-webrtc.js#L564
    // TODO: catch all awareness events and handle them through p2pt

    this.init(signaling, roomName).then(() => this.connect())
  }

  /**
   * initialize P2PT
   *
   * @param {string[]} signaling
   * @param {string} roomName
   * @return {Promise<void>}
   */
  async init (signaling, roomName) {
    const signalingTrackers = await Promise.all(signaling.map((address, i) => {
      // fetch signaling servers if there is an address to a text list supplied (only supports text yet, if json is need here TODO)
      if (address.includes('http')) return fetch(address).then(response => {
          if (response.status >= 200 && response.status <= 299) return response.text()
          throw new Error(response.statusText)
        }).then(text => {
          const trackers = text.split('\n').filter(text => text)
          if (trackers.length) return trackers
          throw new Error('all entries are epmty')
        }).catch(error => '')
      return address
    }))
    this.p2pt = new P2PT(signalingTrackers.flat().filter(text => text), roomName)
    // p2pt events
    this.p2pt.on('trackerconnect', (WebSocketTracker, stats) => this.onTrackerconnect(WebSocketTracker, stats))
    this.p2pt.on('trackerwarning', (Error, stats) => this.onTrackerwarning(Error, stats))
    this.p2pt.on('peerconnect', peer => this.onPeerconnect(peer))
    this.p2pt.on('peerclose', peer => this.onPeerclose(peer))
    this.p2pt.on('msg', (peer, msg) => this.onMsg(peer, msg))
    // awareness setup
    // awareness events
    this.awareness.on('update', (...args) => this.onUpdateAwareness(...args))
    // doc events
    this.doc.on('update', (...args) => this.onUpdateDoc(...args))
    // global events
    self.addEventListener('focus', () => {
      this.connect()
      this.requestMorePeers()
    })
    // don't disconnect on blur
    //self.addEventListener('blur', () => this.disconnect())
    self.addEventListener('beforeunload', () => this.disconnect(), {once: true})
    return this.p2pt
  }

  // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L376
  initAwareness () {
    // TODO: broadcast peers
    // broadcast peerId via broadcastchannel
    //broadcastBcPeerId(this)
    // write sync step 1
    const encoderSync = encoding.createEncoder()
    encoding.writeVarUint(encoderSync, this.getMessageType('messageSync'))
    syncProtocol.writeSyncStep1(encoderSync, this.doc)
    this.send(encoding.toUint8Array(encoderSync))
    // broadcast local state
    const encoderState = encoding.createEncoder()
    encoding.writeVarUint(encoderState, this.getMessageType('messageSync'))
    syncProtocol.writeSyncStep2(encoderState, this.doc)
    this.send(encoding.toUint8Array(encoderState))
    // write queryAwareness
    const encoderAwarenessQuery = encoding.createEncoder()
    encoding.writeVarUint(encoderAwarenessQuery, this.getMessageType('messageQueryAwareness'))
    this.send(encoding.toUint8Array(encoderAwarenessQuery))
    // broadcast local awareness state
    const encoderAwarenessState = encoding.createEncoder()
    encoding.writeVarUint(encoderAwarenessState, this.getMessageType('messageAwareness'))
    encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
    this.send(encoding.toUint8Array(encoderAwarenessState))
  }

  /**
   * start P2ptProvider
   *
   * @return {void}
   */
  connect () {
    this.p2pt.start()
    this.initAwareness()
  }

  /**
   * destroy P2ptProvider
   *
   * @return {void}
   */
  disconnect () {
    return this.p2pt.destroy()
  }

  /**
   * This event is emitted when a successful connection to tracker is made.
   *
   * @param {*} WebSocketTracker
   * @param {stats} stats
   * @return {void}
   */
  onTrackerconnect (WebSocketTracker, stats) {
    this._trackerStats = stats
  }

  /**
   * This event is emitted when some error happens with connection to tracker.
   *
   * @param {*} Error
   * @param {stats} stats
   * @return {void}
   */
  onTrackerwarning (Error, stats) {
    this._trackerStats = stats
  }
  
  /**
   * This event is emitted when a new peer connects.
   *
   * @param {*} peer
   * @return {void}
   */
  onPeerconnect (peer) {
    this._peers.push(peer)
  }

  /**
   * This event is emitted when a peer disconnects.
   *
   * @param {*} peer
   * @return {void}
   */
  onPeerclose (peer) {
    this._peers.splice(this._peers.indexOf(peer), 1)
  }

  /**
   * This event is emitted once all the chunks are received for a message.
   *
   * @param {*} peer
   * @param {string|Uint8Array} msg
   * @return {any}
   */
  onMsg (peer, msg) {
    const msgArr = new Uint8Array(msg.toLocaleString().split(','))
    if (!msgArr || !msgArr.length || (msgArr.length === 1 && msgArr[0] === 0)) {
      return console.log('msg', peer, msg)
    }
    const decoder = decoding.createDecoder(msgArr)
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)
    let sendReply = false
    console.log('msgArr', peer, msg, this.getMessageType(messageType))
    switch (this.getMessageType(messageType)) {
      case 'messageSync': {
        encoding.writeVarUint(encoder, messageType)
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
        if (syncMessageType === syncProtocol.messageYjsSyncStep1) sendReply = true
        break
      }
      case 'messageQueryAwareness':
        encoding.writeVarUint(encoder, messageType)
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys())))
        //sendReply = true // too many messages, something is missing to make awareness settle
        break
      case 'messageAwareness':
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), this)
        break
      case 'messageBcPeerId': {
        const add = decoding.readUint8(decoder) === 1
        const peerName = decoding.readVarString(decoder)
        // TODO: part of making peers aware of each other https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L93
        /*
        if (peerName !== room.peerId && ((room.bcConns.has(peerName) && !add) || (!room.bcConns.has(peerName) && add))) {
          const removed = []
          const added = []
          if (add) {
            room.bcConns.add(peerName)
            added.push(peerName)
          } else {
            room.bcConns.delete(peerName)
            removed.push(peerName)
          }
          room.provider.emit('peers', [{
            added,
            removed,
            webrtcPeers: Array.from(room.webrtcConns.keys()),
            bcPeers: Array.from(room.bcConns)
          }])
          broadcastBcPeerId(room)
        }
        */
       /* https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L277
        * @param {Room} room
        const broadcastBcPeerId = room => {
          if (room.provider.filterBcConns) {
            // broadcast peerId via broadcastchannel
            const encoderPeerIdBc = encoding.createEncoder()
            encoding.writeVarUint(encoderPeerIdBc, messageBcPeerId)
            encoding.writeUint8(encoderPeerIdBc, 1)
            encoding.writeVarString(encoderPeerIdBc, room.peerId)
            broadcastBcMessage(room, encoding.toUint8Array(encoderPeerIdBc))
          }
        }
       */
        break
      }
      default:
        console.error('Unable to compute message')
        break
    }
    if (!sendReply) return null
    this.send(encoding.toUint8Array(encoder))
  }

  /**
   * This event is emitted when a successful connection to tracker is made.
   *
   * @param {{ number[], number[], number[] }} changed
   * @param {string} origin
   * @return {void}
   */
  onUpdateAwareness ({ added, updated, removed }, origin) {
    console.log('onUpdateAwareness', {added, updated, removed, origin})
    // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L354
    const changedClients = added.concat(updated).concat(removed)
    const encoderAwareness = encoding.createEncoder()
    encoding.writeVarUint(encoderAwareness, this.getMessageType('messageAwareness'))
    encoding.writeVarUint8Array(encoderAwareness, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
    this.send(encoding.toUint8Array(encoderAwareness))
  }

  /**
   * This event is emitted when a successful connection to tracker is made.
   *
   * @param {number[]} update
   * @param {string} origin
   * @return {void}
   */
  onUpdateDoc (update, origin) {
    console.log('onUpdateDoc', {update, origin})
    // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L342
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, this.getMessageType('messageSync'))
    syncProtocol.writeUpdate(encoder, update)
    this.send(encoding.toUint8Array(encoder))
  }

  /**
   * send message
   *
   * @param {any} msg
   * @param {*} [peer=this.peers]
   * @param {string} [msgID='']
   * @return {Promise<[*, *]> | Promise<[*, *]>[]}
   */
  async send (msg, peer = this.peers, msgID = '') {
    peer = await Promise.resolve(peer)
    if (Array.isArray(peer)) return peer.map(peer => this.send(msg, peer, msgID))
    console.log('send', msg, peer)
    return this.p2pt.send(peer, typeof msg === 'string' ? msg : msg.toLocaleString(), msgID)
  }

  /**
   * Sets the identifier string used to discover peers in the network
   *
   * @param {string} roomName
   * @return {void}
   */
  changeRoom (roomName) {
    return this.p2pt.setIdentifier(roomName)
  }

  /**
   * Request More Peers
   *
   * @return {Promise<*[]>}
   */
  async requestMorePeers () {
    const trackers = await this.p2pt.requestMorePeers()
    const peers = this._peers
    for (const key in trackers) {
      if (Object.hasOwnProperty.call(trackers, key)) {
        const tracker = trackers[key]
        for (const key in tracker) {
          if (Object.hasOwnProperty.call(tracker, key)) peers.push(tracker[key])
        }
      }
    }
    const ids = []
    return peers.filter(peer => {
      const isDouble = ids.includes(peer.id)
      ids.push(peer.id)
      return !isDouble
    })
  }

  /**
   * Peers
   *
   * @return {Promise<*[]>}
   */
  get peers () {
    return this.requestMorePeers()
  }

  /**
   * get the number encoding for different message types by name
   *
   * @param {string|number} [name='']
   * @return {messageType}
   * @memberof P2ptProvider
   */
  getMessageType (name = '') {
    if (typeof name === 'string') {
      switch (name) {
        case 'messageSync':
          return 0
        case 'messageAwareness':
          return 1
        case 'messageQueryAwareness':
          return 3
        case 'messageBcPeerId':
          return 4
        default:
          return false
      }
    } else if (typeof name === 'number') {
      switch (name) {
        case 0:
          return 'messageSync'
        case 1:
          return 'messageAwareness'
        case 3:
          return 'messageQueryAwareness'
        case 4:
          return 'messageBcPeerId'
        default:
          return false
      }
    }
    return false
  }

  /**
   * Peers
   *
   * @return {stats}
   */
  get trackerStats () {
    return this._trackerStats
  }
}
