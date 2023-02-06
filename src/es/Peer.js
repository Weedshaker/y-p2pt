// @ts-check

import './p2pt.js'

/* global HTMLElement */
/* global document */
/* global self */
/* global fetch */
/* global CustomEvent */

/**
 * Acts as a shim between y-webrtc which tries to talk to https://github.com/feross/simple-peer but forwarding those function calls to https://github.com/subins2000/p2pt
 *
 * @export
 * @function Peer
 * @return {any}
 */
export default class Peer {
  /**
   * Creates an instance of Yjs. The constructor will be called for every custom element using this class when initially created.
   *
   * @param {*} args
   */
  constructor (...args) {
    // @ts-ignore
    console.log('Peer runs', P2PT)

  }
}
