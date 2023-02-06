// @ts-check

import P2PT from './p2pt.js'

// DONT SHIM try to do this properly https://github.com/yjs/y-webrtc/blob/6460662715a89b4c70b88f4dad16676f736e2498/src/y-webrtc.js#L552

/**
 * Peer is a recognized by https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L16 as a https://github.com/feross/simple-peer
 * this class acts as a shim between https://github.com/subins2000/p2pt and https://github.com/feross/simple-peer
 *
 * @export
 * @function Peer
 * @param {any} init
 * @return {any}
 */
export default class Peer extends P2PT {
  // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L183 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#new-p2ptannounceurls---identifierstring--
  constructor (...args) {
    super([
      "wss://tracker.openwebtorrent.com",
      "wss://tracker.sloppyta.co:443/",
      "wss://tracker.novage.com.ua:443/",
      "wss://tracker.btorrent.xyz:443/",
    ], 'weedo-test')
    
    console.log('constructor', args);
    this.peers = []
    this.on('peerconnect', peer => this.peers.push(peer))
    this.on('peerclose', peer => this.peers.splice(this.peers.indexOf(peer, 1)))
  }
  // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L149 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#sendpeer-msg-msgid--
  send (message) {
    console.log('send: ', message);
    this.peers.forEach(peer => super.send(peer, message))
  }
  // destroy 1:1 https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L219 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#destroy
  // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L519 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#sendpeer-msg-msgid--
  signal (message) {
    console.log('signal: ', message);
    this.send(message)
  }
  on (key, func) {
    switch (key) {
      // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L184 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#event-msg
      case 'signal':
        key = 'msg'
        break
      // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L187 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#event-peerconnect
      case 'connect':
        key = 'peerconnect'
        break
      // https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L206 to https://github.com/subins2000/p2pt/blob/master/api-docs.md#event-peerclose
      case 'close':
        key = 'peerclose'
        break
      // no on error handling at p2pt https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L223
      // on data is 1:1 https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L227

    }
    super.on(key, func)
  }
}