// @ts-check

import * as Y from 'yjs'
import P2PT from '../p2pt/dist/p2pt.umd.js'
import * as encoding from '../y-webrtc/node_modules/lib0/encoding.js'
import * as decoding from '../y-webrtc/node_modules/lib0/decoding.js'
import * as math from '../y-webrtc/node_modules/lib0/math.js'
import * as random from '../y-webrtc/node_modules/lib0/random.js'
import * as awarenessProtocol from '../y-webrtc/node_modules/y-protocols/awareness.js'

/**
 * P2ptProvider
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
      // TODO: fetch fresh signaling list
      signaling = ['wss://tracker.openwebtorrent.com', 'wss://tracker.sloppyta.co:443/', 'wss://tracker.novage.com.ua:443/', 'wss://tracker.btorrent.xyz:443/'],
      password = null,
      awareness = new awarenessProtocol.Awareness(doc),
      maxConns = 20 + math.floor(random.rand() * 15), // the random factor reduces the chance that n clients form a cluster
      filterBcConns = true,
      peerOpts = {} // simple-peer options. See https://github.com/feross/simple-peer#peer--new-peeropts
    } = {}
  ) {
    this.awareness = awareness;
    this.p2pt = new P2PT(signaling, roomName)
    console.log('constructor', {roomName, doc, signaling, password, awareness, P2PT: this.p2pt, Y});

      
    // https://github.com/subins2000/p2pt/blob/master/api-docs.md#new-p2ptannounceurls---identifierstring--
    // TODO: start p2pt

    // https://github.com/yjs.js/y-webrtc/blob/6460662715a89b4c70b88f4dad16676f736e2498/src/y-webrtc.js#L564
    // TODO: catch all awareness events and handle them through p2pt
  }
}