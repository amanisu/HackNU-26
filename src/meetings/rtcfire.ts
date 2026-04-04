/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  child,
  DatabaseReference,
  onDisconnect,
  onValue,
  set,
  update,
} from "firebase/database";

// Google STUN servers
const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// Default media constraints
const DEFAULT_MEDIA_CONSTRAINTS = {
  audio: true,
  video: true,
};

const NegotiationState = {
  // offerers only
  OffererNotStarted: "offerer:not-started",
  OffererWaitingForAnswer: "offerer:waiting-for-answer",

  // answerers only
  AnswererWaitingForOffer: "answerer:waiting-for-offer",

  // both
  WaitingToFinishIceCandidates: "waiting-to-finish-ice-candidate",
  Cleanup: "cleanup", // locally
  Complete: "complete", // complete
};

/**
 * A Firebase Realtime Database ref per
 * {@link https://firebase.google.com/docs/reference/js/firebase.database.Reference}
 */
type FirebaseDatabaseRef = any;

/**
 * Options object to initialize an RTCFireSession.
 */
export interface RTCFireSessionOptions {
  /**
   * An ID representing the current user. Could come from Firebase Auth or elsewhere.
   */
  myId: string;

  /**
   * The root RTDB reference where WebRTC negotiations between peers should be read from/written to.
   * After negotiation, this ref shouldn't contain any data.
   */
  negotiationRef:
    | FirebaseDatabaseRef
    | ((peerId: string) => {
        read: FirebaseDatabaseRef;
        write: FirebaseDatabaseRef;
      });

  /**
   * Callback triggered when the user's local stream is available. Triggered with `null` when the
   * local stream is closed.
   */
  onMyStream: (localStream: MediaStream | undefined) => void;

  /**
   * Callback triggered when the given peer's media stream is available. Triggered with `null` when
   * the stream is close/no longer available.
   */
  onParticipantStream: (peerId: string, stream: MediaStream | null) => void;

  /**
   * Should the current user's local audio stream start muted? Can be changed later using
   * {@link RTCFireSession#muted}.
   */
  muted?: boolean;

  /**
   * List of initial set of peer IDs for this session. Can be changed later using
   * {@link RTCFireSession#participants}.
   */
  participants?: string[];

  /**
   * A function that returns true if the current user should be the offerer for a connection with
   * the given peer, and false if the peer should be the offerer. This should be symmetrical for
   * both sides of the connection. Defaults to whichever ID (myId or peerId) sorts first
   * alphabetically.
   */
  isOfferer?: (peerId: string) => boolean;

  /**
   * Optional media stream constraints to pass to `navigator.mediaDevices.getUserMedia`. The default
   * constraints require audio and video.
   */
  mediaConstraints?: MediaStreamConstraints;

  /**
   * A custom RTC configuration to use. The default
   * uses Google's public STUN servers.
   */
  rtcConfig?: RTCConfiguration;

  /**
   * An additional stream to include (e.g. screen sharing or local Gemini live stream).
   */
  sideStream?: MediaStream;
}

type ParticipantInfo = {
  readRef: FirebaseDatabaseRef;
  writeRef: FirebaseDatabaseRef;
  offerer?: boolean;
  conn: RTCPeerConnection;
  streams: MediaStream[];
  negotiationState?: string;
  readVal?: any;
  processedIceCandidates: Set<string>;
  disposers: (() => void)[];
};

/**
 * Class to manage an RTC session with multiple participants
 * using Firebase RTDB
 */
class RTCFireSession {
  private participantInfo: Record<string, ParticipantInfo> = {};
  private localStream: MediaStream | undefined;
  private hasLocalStreams = false;
  private _sideStream: MediaStream | undefined = undefined;
  private _muted = false;
  private _participants: string[] = [];
  private _closed = false;

  constructor(private options: RTCFireSessionOptions) {
    this.options.isOfferer =
      this.options.isOfferer ||
      ((pid) => this.options.myId.localeCompare(pid) < 0);
    this.participants = this.options.participants || [];

    (async () => {
      try {
        this._sideStream = this.options.sideStream;
        this.localStream = await navigator.mediaDevices.getUserMedia(
          options.mediaConstraints || DEFAULT_MEDIA_CONSTRAINTS,
        );
        this.hasLocalStreams = true;
        this.maybeProcessParticipantChanges();

        this.muted = !!this.options.muted;
      } catch (error) {
        console.error("Error getting local video stream", error);
      }

      this.options.onMyStream(this.localStream);
    })();
  }

  /**
   * Shuts down the entire session
   */
  close() {
    for (let pid in this.participantInfo) {
      this.onRemoveParticipant(pid);
    }

    if (this.localStream) {
      // send null stream to mitigate mobile freezing issues
      // https://github.com/twilio/twilio-video-app-react/issues/355
      this.options.onMyStream(undefined);
      for (let track of this.localStream.getTracks()) {
        track.stop();
      }
    }

    this._closed = true;
  }

  /**
   * The list of peer IDs for this session.
   */
  get participants() {
    // TODO: cache?
    return this._participants;
  }

  /**
   * Update the list of peer IDs for this session.
   */
  set participants(participants) {
    this._participants = [...participants];
    this.maybeProcessParticipantChanges();
  }

  get sideStream() {
    return this._sideStream;
  }

  set sideStream(sideStream) {
    if (this._closed) return;
    // requires re-initting connections
    for (let pid of this._participants) {
      this.initConnectionForParticipant(pid);
    }
    this._sideStream = sideStream;
  }

  /**
   * Sets up connections for new participants, and
   * tears down connections for removed ones.
   */
  private maybeProcessParticipantChanges() {
    if (!this.hasLocalStreams || this._closed) {
      return;
    }

    let set = new Set(this._participants);
    for (let pid of set) {
      if (!(pid in this.participantInfo) && pid !== this.options.myId) {
        this.onAddParticipant(pid);
      }
    }

    for (let existingId in this.participantInfo) {
      if (!set.has(existingId)) {
        this.onRemoveParticipant(existingId);
      }
    }
  }

  /**
   * Get the current user's audio stream muted state.
   */
  get muted() {
    return !!this._muted;
  }

  /**
   * Set the current user's audio stream muted state.
   */
  set muted(muted) {
    this._muted = muted;
    if (this.localStream) {
      for (let t of this.localStream
        .getTracks()
        .filter((t) => t.kind === "audio")) {
        t.enabled = !muted;
      }
    }
  }

  /**
   * Handle a participant being added
   */
  private onAddParticipant(pid: string) {
    if (pid in this.participantInfo) {
      // already added
      return;
    }

    let offerer = !!this.options.isOfferer?.(pid);

    let readRef: DatabaseReference, writeRef: DatabaseReference;
    if (typeof this.options.negotiationRef === "function") {
      // function signature: pid => ({ read, write });
      ({ read: readRef, write: writeRef } = this.options.negotiationRef(pid));
    } else {
      // assume it's a root ref
      writeRef = child(
        this.options.negotiationRef,
        `${this.options.myId}/${pid}`,
      );
      readRef = child(
        this.options.negotiationRef,
        `${pid}/${this.options.myId}`,
      );
    }

    let info: ParticipantInfo = {
      readRef,
      writeRef,
      offerer,
      conn: undefined as any, // initialized momentarily
      processedIceCandidates: undefined as any, // initialized momentarily
      streams: [],
      disposers: [],
    };

    info.disposers.push(() => set(writeRef, null));

    this.participantInfo[pid] = info;
    this.initConnectionForParticipant(pid);

    info.disposers.push(
      onValue(readRef, (snap) => {
        info.readVal = snap.val() || {};
        this.maybeContinueNegotiation(pid);
      }),
    );

    let writeRefOnDisconnect = onDisconnect(writeRef);
    writeRefOnDisconnect.set(null);
    info.disposers.push(() => writeRefOnDisconnect?.cancel());
  }

  /**
   * Handles a participant being removed
   */
  private onRemoveParticipant(pid: string) {
    if (!(pid in this.participantInfo)) {
      return;
    }

    this.options.onParticipantStream(pid, null);
    this.teardownConnectionForParticipant(pid);
    this.participantInfo[pid]?.disposers.forEach((td) => td());
    delete this.participantInfo[pid];
  }

  /**
   * Creates a new RTC connection for the participant,
   * tearing down the existing one if it exists
   */
  private initConnectionForParticipant(pid: string) {
    this.teardownConnectionForParticipant(pid);

    let info = this.participantInfo[pid];
    let { offerer, writeRef } = info;

    info.negotiationState = offerer
      ? NegotiationState.OffererNotStarted
      : NegotiationState.AnswererWaitingForOffer;
    info.processedIceCandidates = new Set();

    info.conn = new RTCPeerConnection(
      this.options.rtcConfig || DEFAULT_RTC_CONFIG,
    );

    info.conn.onicecandidate = (ev) => {
      let c = ev.candidate;
      if (!c) {
        // done
        update(writeRef, { iceDone: true });
        return;
      }
      let cKey = hashString(`${c.candidate}|${c.sdpMLineIndex}`);
      set(child(writeRef, `iceCandidates/${cKey}`), {
        sdpMLineIndex: c.sdpMLineIndex,
        candidate: c.candidate,
      });
    };

    info.conn.ontrack = (ev: RTCTrackEvent) => {
      info.streams = [...ev.streams];
      for (let stream of info.streams) {
        this.options.onParticipantStream(pid, stream);
      }
    };

    info.conn.onconnectionstatechange = () => {
      switch (info.conn.connectionState) {
        case "connected":
          // Fully connected
          break;

        case "disconnected":
        case "failed":
        case "closed":
          // Tear down and reinit connection
          this.options.onParticipantStream(pid, null);
          this.teardownConnectionForParticipant(pid);
          this.initConnectionForParticipant(pid);
          this.maybeContinueNegotiation(pid);
          break;
      }
    };

    if (offerer) {
      this.addLocalStreamToConnection(info.conn); // triggers negotiation
      info.conn.onnegotiationneeded = () => this.beginNegotiation(pid);
    }
  }

  /**
   * Tears down the RTC connection for a participant
   */
  private teardownConnectionForParticipant(pid: string) {
    let info = this.participantInfo[pid];
    if (!info.conn) {
      return;
    }

    info.conn.onicecandidate = null;
    info.conn.ontrack = null;
    info.conn.onconnectionstatechange = null;
    info.conn.onnegotiationneeded = null;
    info.conn.close();
    info.conn = undefined as any;
  }

  private processNewIceCandidates(pid: string) {
    let info = this.participantInfo[pid];
    let { conn, readVal, processedIceCandidates } = info;
    let {
      iceCandidates,
    }: { iceCandidates: { [key: string]: RTCIceCandidateInit } } = readVal;
    if (!conn?.remoteDescription?.type || !iceCandidates) {
      return;
    }

    for (let { sdpMLineIndex, candidate } of Object.values(iceCandidates)) {
      let cKey = `${sdpMLineIndex}|${candidate}`;
      if (processedIceCandidates.has(cKey)) {
        continue;
      }

      conn.addIceCandidate(new RTCIceCandidate({ sdpMLineIndex, candidate }));
      processedIceCandidates.add(cKey);
    }
  }

  /**
   * Begins WebRTC negotiation. Should only be done if we're the offerer.
   */
  private async beginNegotiation(pid: string) {
    let info = this.participantInfo[pid];
    if (!info) {
      return;
    }

    let { offerer, writeRef } = info;
    if (!offerer) {
      return;
    }

    info.negotiationState = NegotiationState.OffererWaitingForAnswer;
    let sessionDescription = await info.conn.createOffer();
    info.conn.setLocalDescription(sessionDescription);
    await update(writeRef, {
      offer: sessionDescription,
    });
  }

  /**
   * Makes progress on negotiating the RTC connection
   * if the state requires it
   */
  private async maybeContinueNegotiation(pid: string) {
    let info = this.participantInfo[pid];
    let { conn, negotiationState, writeRef, readVal } = info;

    switch (negotiationState) {
      case NegotiationState.OffererNotStarted: {
        // do nothing here, as we're waiting for 'negotiationneeded'
        break;
      }

      case NegotiationState.AnswererWaitingForOffer: {
        let { offer } = readVal;
        if (offer) {
          info.negotiationState = NegotiationState.WaitingToFinishIceCandidates;
          conn.setRemoteDescription(new RTCSessionDescription(offer));
          this.addLocalStreamToConnection(info.conn);
          let sessionDescription = await conn.createAnswer();
          conn.setLocalDescription(sessionDescription);
          await update(writeRef, {
            answer: sessionDescription,
          });
        }
        break;
      }

      case NegotiationState.OffererWaitingForAnswer: {
        let { answer } = readVal;
        if (answer) {
          info.negotiationState = NegotiationState.WaitingToFinishIceCandidates;
          await conn.setRemoteDescription(new RTCSessionDescription(answer));
        }
        break;
      }

      case NegotiationState.WaitingToFinishIceCandidates: {
        let { iceDone } = readVal;
        if (iceDone) {
          info.negotiationState = NegotiationState.Cleanup;
        }
        break;
      }

      case NegotiationState.Cleanup: {
        let { cleanup } = readVal;
        // we're ready for cleanup on our end, indicate as such
        update(writeRef, { cleanup: true });
        if (cleanup || Object.keys(readVal).length === 0) {
          // once remote is also ready for cleanup, move to complete state
          info.negotiationState = NegotiationState.Complete;
        }
        break;
      }

      case NegotiationState.Complete: {
        set(writeRef, null);
        break;
      }
    }

    this.processNewIceCandidates(pid);

    if (info.negotiationState !== negotiationState) {
      // progress was made, run again
      this.maybeContinueNegotiation(pid);
    }
  }

  /**
   * Attaches the local media stream to a given RTCPeerConnection,
   * if the stream exists already.
   */
  private addLocalStreamToConnection(conn: RTCPeerConnection) {
    if (!this.localStream) {
      return;
    }

    for (let track of this.localStream.getTracks()) {
      conn.addTrack(track, this.localStream);
    }

    if (this._sideStream) {
      for (let track of this._sideStream.getTracks()) {
        conn.addTrack(track, this._sideStream);
      }
    }
  }
}

/**
 * Simple function that hashes a string to another string
 */
function hashString(s: string) {
  let hash = 0;

  if (s.length === 0) {
    return "0";
  }

  for (let i = 0; i < s.length; i++) {
    let chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return (hash & 0xfffffff).toString(36);
}

/**
 * Creates a new RTCFireSession with the given options.
 */
export function rtcFireSession(options: RTCFireSessionOptions) {
  return new RTCFireSession(options);
}

export type { RTCFireSession };
