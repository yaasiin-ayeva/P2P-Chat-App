import { Component } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Peer, PeerJSOption } from 'peerjs';
import Chat from 'src/models/chat.model';

export enum SCREEN {
  'LOGIN' = 'login',
  'LOGOUT' = 'logout',
  'CHAT' = 'chat',
}
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  screen: SCREEN = SCREEN.LOGIN;

  appPrefix: string = "synk-11-secure-p2p-multichat-"; // the prefix we will preprend to usernames;
  oldChats: any;
  chats: any[] = [];

  loading: boolean = false;
  peerError: string = '';
  currentUser: string = '';
  recipient: string = '';

  peerId: string = '';
  chat: any;

  peer: any = {};
  targetIdInput: string = '';
  peerIds: string[] = [];
  connections: any = {};
  chatMessageInput: any = '';

  options: PeerJSOption;

  constructor(private storage: Storage) {
    this.options = {
      config: {
        iceServers: [
          {
            urls: [
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
            ]
          },
          {
            urls: "turn:relay.metered.ca:80",
            username: "fd53a7b7c7efba23a43de395",
            credential: "kev5FGXr7qpZtj1O",
          },
          {
            urls: "turn:relay.metered.ca:443",
            username: "fd53a7b7c7efba23a43de395",
            credential: "kev5FGXr7qpZtj1O",
          },
          {
            urls: "turn:relay.metered.ca:443?transport=tcp",
            username: "fd53a7b7c7efba23a43de395",
            credential: "kev5FGXr7qpZtj1O",
          },
        ],
      },
      debug: 3
    };
  }

  async ngOnInit() {

    await this.storage.create();
    await this.storage.get("chats").then((chats) => {
      this.oldChats = chats;
      this.chats = this.oldChats ? JSON.parse(this.oldChats) : []; // oldChats may be undefined, which throws error if passed into JSON.parse
    });
    
    await this.storage.get("username").then((username) => {
      this.currentUser = username;
      this.chats = this.oldChats ? JSON.parse(this.oldChats) : []; // oldChats may be undefined, which throws error if passed into JSON.parse
    });
  }

  async login() {
    if (this.currentUser.length > 0 && !this.loading) {
      this.loading = true; // update status
      this.peerError = ""; // reset error status
      this.storage.set("username", this.currentUser); // set username cookie to instanciate it at the next session
      this.createPeer();
    }
  }

  createPeer() {
    // options are useful in development to connect to local peerjs server
    this.peer = new Peer(this.getPeerId(this.currentUser), this.options);

    // when peer is connected to signaling server
    this.peer.on("open", () => {
      this.screen = SCREEN.CHAT; // changing screen
      this.loading = false;
      this.peerError = "";
    });

    // error listener
    this.peer.on("error", (error: any) => {
      if (error.type === "peer-unavailable") { // if connection with new peer can't be established
        this.loading = false;
        this.peerError = `${this.targetIdInput} is unreachable!`; // custom error message
        this.targetIdInput = "";
      } else if (error.type === "unavailable-id") { // if requested id (thus username) is already taken
        this.loading = false;
        this.peerError = `${this.currentUser} is already taken!`; // custom error message
      } else this.peerError = error; // default error message
    });

    // when peer receives a connection
    this.peer.on('connection', (conn: any) => {
      if (!this.peerIds.includes(conn.peer)) {
        this.recipient = this.getUsername(conn.peer);
        this.configureConnection(conn);

        conn.on("open", () => {
          this.addConnection(conn);

          // send every connection previously established to connect everyone (merge chat rooms)
          conn.send({
            type: "connections",
            peerIds: this.peerIds
          });
        });
      }
    });
  }

  configureConnection(conn: any) {
    conn.on("data", (data: any) => {
      // if data is about connections (the list of peers sent when connected)
      if (data.type === "connections") {
        data.peerIds.forEach((peerId: string) => {
          if (!this.connections[peerId]) {
            this.initiateConnection(peerId);
          }
        });
      } else if (data.type === "chat") {
        this.receiveChat(data.chat);
      }
      // please note here that if data.type is undefined, this endpoint won't do anything!
    });
    conn.on("close", () => this.removeConnection(conn));
    conn.on("error", () => this.removeConnection(conn));

    // if the caller joins have a call, we merge calls
    conn.metadata.peerIds.forEach((peerId: string) => {
      if (!this.connections[peerId]) {
        this.initiateConnection(peerId);
      }
    });
  }

  // util functions to convert username to peer ids and vice-versa
  getPeerId(usernameInput: string): string {
    return this.appPrefix + usernameInput;
  }

  getUsername(peerId: string): string {
    return peerId ? peerId.slice(this.appPrefix.length) : "";
  }

  // we keep track of connections ourselves as suggested in peerjs's documentation
  addConnection(conn: any) {
    this.connections[conn.peer] = conn;
    this.updatePeerIds();
    console.log(`Connected to ${conn.peer}!`);
  }

  removeConnection(conn: any) {
    delete this.connections[conn.peer];
    this.updatePeerIds();
  }

  updatePeerIds() {
    this.peerIds = Object.keys(this.connections);
  }

  disconnectPeer() {
    this.peer.disconnect();
  }

  // called to initiate a connection (by the caller)
  initiateConnection(peerId: string) {
    if (!this.peerIds.includes(peerId) && peerId !== this.peer.id) {
      this.loading = true;
      this.peerError = "";

      console.log(`Connecting to ${peerId}...`);

      this.recipient = this.getUsername(peerId);

      const options = {
        metadata: {
          // if the caller has peers, we send them to merge calls
          peerIds: this.peerIds
        },
        serialization: "json"
      };
      const conn = this.peer.connect(peerId, options);
      this.configureConnection(conn);

      conn.on("open", () => {
        this.addConnection(conn);
        if (this.getUsername(conn.peer) === this.targetIdInput) {
          this.targetIdInput = "";
          this.loading = false;
        }
      });
    }
  }

  submitConnection() {
    const peerId = this.getPeerId(this.targetIdInput); // the peer's id we want to connect to
    this.initiateConnection(peerId);
  }

  receiveChat(chat: any) {
    this.chats.push(chat);
    this.storage.set("chats", JSON.stringify(this.chats));
  }

  submitChat() {
    if (this.chatMessageInput.length > 0) {
      
      const chat: Chat = new Chat(this.currentUser, this.recipient, this.chatMessageInput);
      this.receiveChat(chat); // simulate receiving a chat

      // Send chat message to specific receiver or all connected users depending on the broadcast
      Object.values(this.connections).forEach((conn: any) => {
        if (chat.isBroadCast() || this.getUsername(conn.peer) === chat.receiver) {
          conn.send({
            type: "chat",
            chat
          });
        }
      });
      this.chatMessageInput = ""; // reset chat message input
    }
  }
}