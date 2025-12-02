import { NetworkPacket } from '../types';

// Declare global PeerJS types since we are using CDN
declare const Peer: any;

class P2PService {
  private peer: any;
  private connections: Map<string, any> = new Map(); // id -> connection
  private onDataCallback: ((data: NetworkPacket) => void) | null = null;
  public myId: string = '';

  initialize(onId: (id: string) => void, onData: (data: NetworkPacket) => void) {
    // If already initialized, just update callbacks
    if (this.peer && !this.peer.destroyed) {
      this.onDataCallback = onData;
      if (this.myId) onId(this.myId);
      return;
    }

    this.peer = new Peer(null, {
      debug: 2
    });

    this.onDataCallback = onData;

    this.peer.on('open', (id: string) => {
      this.myId = id;
      console.log('My peer ID is: ' + id);
      onId(id);
    });

    this.peer.on('connection', (conn: any) => {
      this.handleConnection(conn);
    });
  }

  // Allow React to update the callback so it always has the latest State (Entities, Host status)
  setOnData(cb: (data: NetworkPacket) => void) {
    this.onDataCallback = cb;
  }

  connectToPeer(peerId: string, onConnect?: () => void) {
    if (!this.peer) return;
    const conn = this.peer.connect(peerId);
    this.handleConnection(conn, onConnect);
  }

  private handleConnection(conn: any, onConnect?: () => void) {
    conn.on('open', () => {
      console.log('Connected to: ' + conn.peer);
      this.connections.set(conn.peer, conn);
      if (onConnect) onConnect();
    });

    conn.on('data', (data: NetworkPacket) => {
      if (this.onDataCallback) {
        this.onDataCallback(data);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed: ' + conn.peer);
      this.connections.delete(conn.peer);
    });

    conn.on('error', (err: any) => {
      console.error(err);
    });
  }

  broadcast(packet: NetworkPacket) {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(packet);
      }
    });
  }

  sendTo(peerId: string, packet: NetworkPacket) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(packet);
    } else {
        console.warn(`Cannot send to ${peerId}: Connection not open or not found.`);
    }
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections.clear();
  }
}

export const p2pService = new P2PService();