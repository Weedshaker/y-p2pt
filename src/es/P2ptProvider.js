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
 * @typedef {0|1|3|4|false} messageType
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
    // awareness events
    this.awareness.on('update', (...args) => this.onUpdate(...args))
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

  /**
   * start P2ptProvider
   *
   * @return {void}
   */
  connect () {
    return this.p2pt.start()
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
   * @param {string} msg
   * @return {void}
   */
  onMsg (peer, msg) {
    console.log('msg', peer, msg)
  }

  /**
   * This event is emitted when a successful connection to tracker is made.
   *
   * @param {{ number[], number[], number[] }} changed
   * @param {string} origin
   * @return {void}
   */
  onUpdate ({ added, updated, removed }, origin) {
    console.log('onUpdate', {added, updated, removed, origin})
    // https://github.com/yjs/y-webrtc/blob/6460662715a89b4c70b88f4dad16676f736e2498/src/y-webrtc.js#L354
    const changedClients = added.concat(updated).concat(removed)
    const encoderAwareness = encoding.createEncoder()
    encoding.writeVarUint(encoderAwareness, this.getMessageType('messageAwareness'))
    encoding.writeVarUint8Array(encoderAwareness, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
    console.log('broadcast message', this, encoding.toUint8Array(encoderAwareness))
  }

  /**
   * send message
   *
   * @param {string} msg
   * @param {*} [peer=this.peers]
   * @param {string} [msgID='']
   * @return {Promise<[*, *]> | Promise<[*, *]>[]}
   */
  async send (msg, peer = this.peers, msgID = '') {
    peer = await Promise.resolve(peer)
    if (Array.isArray(peer)) return peer.map(peer => this.send(msg, peer, msgID))
    console.log('send', msg, peer)
    return this.p2pt.send(peer, msg, msgID)
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
   * @param {string} [name='']
   * @return {messageType}
   * @memberof P2ptProvider
   */
  getMessageType (name = '') {
    switch (name) {
      case 'messageSync':
        return 0
      case 'messageAwareness':
        return 1
      case 'messageQueryAwareness':
        return 3
      case 'messagePeerId':
        return 4
      default:
        return false
    }
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
