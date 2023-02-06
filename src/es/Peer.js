// @ts-check

import P2PT from './p2pt.js'

/**
 * Peer is a recognized by https://github.com/yjs/y-webrtc/blob/master/src/y-webrtc.js#L16 as a https://github.com/feross/simple-peer
 * this class acts as a shim between https://github.com/subins2000/p2pt and https://github.com/feross/simple-peer
 *
 * @export
 * @function Peer
 * @param {any} init
 * @return {any}
 */
export default class Peer {
  send (...args) {
    console.log('send args: ', {args, 'this': this, P2PT});
  }
  on (...args) {
    console.log('on args: ', {args, 'this': this, P2PT});
  }
}