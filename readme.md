# y-p2pt

> p2pt Connector for Yjs https://github.com/subins2000/p2pt which replaces the Peer class from simple-peer with the Peer class from p2pt


### Installation

- https://github.com/yjs/yjs#providers


### TODO

https://notebooklm.google.com

To adjust the y-p2pt provider to include awareness updates and fix any missing or incorrect parts compared to p2pt, you will need to incorporate the awareness protocol and ensure data is correctly exchanged between peers. Here's a breakdown of how to approach this, drawing from the provided sources and our conversation history:
Key Adjustments for 
The y-p2pt library is a "p2pt Connector for Yjs"
. The goal is to modify it so that it can support awareness, and correctly implement the p2pt library.
1.
Incorporate the Awareness CRDT:
◦
You need to add the Awareness CRDT, which is part of y-protocols/awareness.js
. This CRDT manages user presence and other awareness information.
◦
Create an instance of awarenessProtocol.Awareness for each Yjs document within the y-p2pt provider
. This instance will manage both local and remote awareness states. The provider usually maintains this instance and makes it available as a property.
◦
You can create an awareness object like this:
2.
Implement the Awareness Protocol:
◦
The awareness protocol dictates how to encode and apply awareness updates. The y-websocket implementation can be a good example of how to do this
.
◦
Use awarenessProtocol.encodeAwarenessUpdate to encode awareness states into a Uint8Array
.
◦
Use awarenessProtocol.applyAwarenessUpdate to apply received awareness updates to the local Awareness instance
.
◦
Use awarenessProtocol.removeAwarenessStates to mark clients as offline when they disconnect
.
3.
Integrate with p2pt:
◦
The p2pt library provides the peer-to-peer connection mechanism
.
◦
You must modify the y-p2pt provider to send and receive awareness updates via p2pt.
◦
You'll need to add logic to your p2pt message handler to distinguish between Yjs document updates and awareness updates and handle them accordingly.
4.
Handle Awareness Events:
◦
Listen for the update event on your Awareness instance. This event fires when the local awareness state changes, and the callback provides which clients were added, updated, or removed
.
◦
Use the callback to encode awareness updates using awarenessProtocol.encodeAwarenessUpdate and broadcast these updates to peers via p2pt
.
◦
Implement an event listener for the change event on the Awareness instance. The change event is triggered when a state is added, updated, or removed. You can use this event to implement local updates
.
5.
Fix Missing or Incorrect Parts Compared to p2pt:
◦
The p2pt library uses WebTorrent trackers as signalling servers
. Make sure your y-p2pt provider is correctly using this mechanism to find peers.
◦
Ensure messages are correctly chunked, sent, and reassembled using p2pt's capabilities for sending long messages
.
◦
Pay special attention to how p2pt converts identifiers to info hashes, which are used by WebTorrent trackers
.  Make sure this is done correctly in y-p2pt.
◦
If necessary, implement the JSON messaging system provided by p2pt
.
Code Adjustments
The file https://github.com/Weedshaker/y-p2pt/blob/main/src/es/y-p2pt.js#L3-L4 will need to be modified to support awareness. Here's a conceptual overview of how to modify y-p2pt.js for awareness, based on our previous discussion, along with an example of how to send awareness updates. This conceptual code builds on the example from our previous conversation, but is tailored to the p2pt library:

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import P2PT from 'p2pt'; // Assuming p2pt is correctly imported

class P2PTProvider {
    constructor(roomName, ydoc, opts = {}) {
        this.doc = ydoc;
        this.roomName = roomName;
        this.awareness = new awarenessProtocol.Awareness(this.doc);
        this.p2pt = new P2PT(opts.trackers, roomName);
        this.p2pt.on('peer', (peer) => {
          this.handlePeer(peer);
        });

        this.p2pt.on('message', message => {
            this.handleMessage(message);
        });
        // when the peer is disconnected, remove the awareness
        this.p2pt.on('peer-disconnect', peer => {
          awarenessProtocol.removeAwarenessStates(
                this.awareness,
                [ peer.id ], // or however you identify the peer
                'peer disconnect'
          );
        });
        
         this.awareness.on('update', ({ added, updated, removed }) => {
              const changedClients = added.concat(updated).concat(removed);
              const encodedAwUpdate = awarenessProtocol.encodeAwarenessUpdate(
                  this.awareness,
                  changedClients
              );
              this.p2pt.send({type: 'awareness', data: encodedAwUpdate});
        });
        
    }
    handlePeer(peer) {
         const encodedAwState = awarenessProtocol.encodeAwarenessUpdate(
              this.awareness,
              Array.from(this.awareness.getStates().keys())
         );
        peer.send({ type: 'awareness', data: encodedAwState});
    }
     handleMessage(message) {
      if (message.type === 'sync') {
          // Handle Yjs sync message
          Y.applyUpdate(this.doc, message.data);
      } else if (message.type === 'awareness') {
          // Handle awareness message
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            message.data,
            message.origin
        );
      }
    }
    destroy() {
      this.p2pt.destroy()
      this.awareness.destroy()
    }
}
export default P2PTProvider;

Additional Notes
•
WebTorrent Trackers: Make sure you are using valid WebTorrent tracker URLs in your p2pt constructor
.
•
Error Handling: Implement proper error handling for network issues and message processing.
•
Testing: Thoroughly test the provider to ensure awareness updates and document updates are correctly synchronized.
•
Modularity:  Keep your code modular and easy to maintain.
By implementing these steps, you will be able to integrate awareness into the y-p2pt provider. The conceptual code above is a starting point. You'll need to fill in details like how the p2pt library is instantiated, how peers are managed, and how messages are sent and received within the p2pt library.


### Rough Roadmap

Provider usable analog other providers for yjs

## Credit

Created by [スィルヴァン aka. Weedshaker](https://github.com/Weedshaker)
