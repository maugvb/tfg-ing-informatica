import { Subject } from 'rxjs'
import {
  JoinAudioOptions,
  JoinVideoOptions,
  JoinTextOptions,
  MessageAudioJoin,
  MessageAudioSuccess,
  MessageAudioParticipants,
  MessageVideoJoin,
  MessageVideoSuccess,
  MessageVideoParticipants,
  Participant,
  AudioParticipant,
  VideoParticipant,
  Publisher,
  PluginHandle,
  Janus as JanusClass,
  MessagesType,
  MessageTalkEvent,
  VideoRoom,
  AudioRoom,
  Room,
  SwitchRequest
} from './janus.types'

import Janus from '../../janus/janus' // new import

const AUDOBRIDGE_PLUGIN_NAME = 'janus.plugin.audiobridge'
const VIDEOROOM_PLUGIN_NAME = 'janus.plugin.videoroom'
const TEXTROOM_PLUGIN_NAME = 'janus.plugin.textroom'
const opaqueId = Janus.randomString(12)
const MAX_SUBSCRIPTIONS = 3
class JanusClient {
  // url: string // Janus URL
  urlList: Array<string>
  initJanus = false // Specify if the Janus library was initialized or not
  webrtcUp = false // Specify if the audio stream was sent to Janus or not
  client: JanusClass | undefined // Instance of Janus

  // Janus plugins
  audioBridgePlugin: PluginHandle | undefined // Audio Bridge plugin instance
  videoRoomPlugin: PluginHandle | undefined // Video Room plugin instance
  textRoomPlugin: PluginHandle | undefined // Text Room plugin instance

  // Aux variables
  audioOptions: JoinAudioOptions = {} // Audio options

  // Remote feeds
  // Video
  activeFeedList: Array<number> = [ 0, 0, 0 ]
  feedStreams = {}
  mediaStreams = {}
  subscriptionHandlers = {}
  localTracks = {}
  localVideos = 0

  // Audio
  audioStream: MediaStream = new MediaStream()

  AUDIO_ROOM_DEFAULT = 1000000 // Default audio room
  VIDEO_ROOM_DEFAULT = 1000000 // Default video room
  TEXT_ROOM_DEFAULT = 1234 // Default text room

  rooms: Array<Room> = [] // Existing rooms

  id = 0 // Id that identifies the user in Janus

  // Flag used to switch video rooms when needed
  pendingToSwitch: SwitchRequest | undefined

  userIsGuide = false
  subscriberPluginattached = false
  user: Participant = {}
  audioElement: HTMLAudioElement
  videoElement1: HTMLVideoElement
  videoElement2: HTMLVideoElement
  videoElement3: HTMLVideoElement

  newAudioElement: HTMLAudioElement
  newVideoElement1: HTMLVideoElement
  newVideoElement2: HTMLVideoElement
  newVideoElement3: HTMLVideoElement

  onChange = new Subject<Array<Room>>()
  onParticipants = new Subject<Array<Room>>()
  onPublishers = new Subject<{}>()
  onUnpublish = new Subject<number>()
  onUser = new Subject<Participant>()
  onTalking = new Subject<MessageTalkEvent>()
  onStopTalking = new Subject<MessageTalkEvent>()
  onVideoFeedUpdate = new Subject<Array<number>>()
  onMediattached = new Subject<MediaStream>()

  constructor (pUrlList: Array<string>) {
    this.urlList = pUrlList
  }

  /**
   *
   * Session init and plugin attachment
   *
   **/

  init (debug = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        Janus.init({
          debug,
          callback: () => {
            this.initJanus = true
            resolve(true)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * With the Janus instance initialized, creates a session and
   * attaches the required plugins.
   */
  connectToJanus (): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.createSession()
        .then(async () => {
          await this.attachPlugins()
        })
        .then(() => {
          resolve(true)
        })
        .catch(() => {
          console.error('::: Janus - There has been an error during the plugin attachment.')
          reject(false)
        })
    })
  }

  private createSession (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.initJanus) {
        try {
          this.client = new Janus({
            server: this.urlList,
            dependencies: Janus.useDefaultDependencies(),
            success: resolve,
            error: reject
          })
        } catch (error) {
          reject(error)
        }
      } else {
        reject(new Error('Could not initialize Janus'))
      }
    })
  }

  private attachPlugins (): Promise<any[]> {
    return Promise.all([ this.attachAudioBridgePlugin(), this.attachVideoRoomPlugin(), this.attachTextRoomPlugin() ])
  }

  private attachAudioBridgePlugin (): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.audioBridgePlugin = await this.attachToAudioBridge()
        Janus.log(`Plugin attached! ( 
        ${this.audioBridgePlugin.getPlugin()}, id=${this.audioBridgePlugin.getId()})`)
        resolve()
      } catch (error) {
        reject(`Could not attach audioBridge plugin: ${error}`)
      }
    })
  }

  private attachVideoRoomPlugin (): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.videoRoomPlugin = await this.attachToVideoRoom()
        Janus.log(`Plugin attached! (
          ${this.videoRoomPlugin.getPlugin()}, id=${this.videoRoomPlugin.getId()})`)
        resolve()
      } catch (error) {
        reject(`Could not attach videoRoom plugin: ${error}`)
      }
    })
  }

  private attachTextRoomPlugin (): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.textRoomPlugin = await this.attachToTextRoom()
        Janus.log(`Plugin attached! (
          ${this.textRoomPlugin.getPlugin()}, id=${this.textRoomPlugin.getId()})`)
        // Setup the DataChannel
        this.textRoomPlugin.send({ message: { request: 'setup' } })
        resolve()
      } catch (error) {
        reject(`Could not attach textRoom plugin: ${error}`)
      }
    })
  }

  private async attachVideoSubscriberPlugin (publisherId: number) {
    try {
      const pluginHandle = await this.attachToVideoRoomSubscriber(publisherId)
      if (pluginHandle) {
        Janus.log(`Plugin attached! (${pluginHandle.getPlugin()}, id=${pluginHandle.getId()})`)
        this.subscriptionHandlers[publisherId] = pluginHandle
        this.subscriptionHandlers[publisherId].remoteTracks = {}
        this.subscriptionHandlers[publisherId].remoteVideos = 0
        this.subscriptionHandlers[publisherId].simulcastStarted = false
      } else {
        Janus.log('Error, the videoroom plugin for subscriptions could not be attached')
      }
    } catch (e) {
      console.error(`Error: ${e}`)
    }
  }

  private attachToAudioBridge (): Promise<PluginHandle> {
    return new Promise<PluginHandle>((resolve, reject) => {
      this.client &&
        this.client.attach({
          plugin: AUDOBRIDGE_PLUGIN_NAME,
          opaqueId,
          success: resolve,
          error: reject,
          iceState: this.onIceState.bind(this),
          mediaState: this.onMediaState.bind(this),
          webrtcState: this.onWebrtcState.bind(this),
          onmessage: this.onMessageAudio.bind(this),
          onlocaltrack: this.onLocalAudioTrack.bind(this),
          onremotetrack: this.onRemoteAudioTrack.bind(this),
          oncleanup: this.onCleanUp.bind(this)
        })
    })
  }

  private attachToVideoRoom (): Promise<PluginHandle> {
    return new Promise<PluginHandle>((resolve, reject) => {
      this.client &&
        this.client.attach({
          plugin: VIDEOROOM_PLUGIN_NAME,
          opaqueId,
          success: resolve,
          error: reject,
          iceState: this.onIceState.bind(this),
          mediaState: this.onMediaState.bind(this),
          webrtcState: this.onWebrtcState.bind(this),
          onmessage: this.onMessageVideo.bind(this),
          onlocaltrack: this.onLocalVideoTrack.bind(this),
          onremotetrack: this.onRemoteVideoTrack.bind(this),
          oncleanup: this.onCleanUp.bind(this)
        })
    })
  }

  private attachToVideoRoomSubscriber (publisherId: number): Promise<PluginHandle> {
    return new Promise<PluginHandle>((resolve, reject) => {
      this.client &&
        this.client.attach({
          plugin: VIDEOROOM_PLUGIN_NAME,
          opaqueId,
          success: resolve,
          error: reject,
          iceState: this.onIceState.bind(this),
          webrtcState: this.onWebrtcState.bind(this),
          onmessage: this.onMessageVideoSubscriber.bind(this, publisherId),
          slowLink: this.onSlowLink.bind(this),
          onlocaltrack: this.onLocalVideoTrack.bind(this),
          // onlocalstream: this.onLocalVideoStream.bind(this), // OLD
          onremotetrack: this.onRemoteVideoSubscriberTrack.bind(this, publisherId),
          // onremotestream: this.onRemoteVideoSubscriberStream.bind(this, publisherId), // OLD
          oncleanup: this.onCleanUp.bind(this)
        })
    })
  }

  private attachToTextRoom (): Promise<PluginHandle> {
    return new Promise<PluginHandle>((resolve, reject) => {
      this.client &&
        this.client.attach({
          plugin: TEXTROOM_PLUGIN_NAME,
          opaqueId,
          success: resolve,
          error: reject,
          iceState: this.onIceState.bind(this),
          mediaState: this.onMediaState.bind(this),
          webrtcState: this.onWebrtcState.bind(this),
          onmessage: this.onMessageText.bind(this),
          ondataopen: this.onDataOpen.bind(this),
          ondata: this.onData.bind(this),
          oncleanup: this.onCleanUp.bind(this)
        })
    })
  }

  /**
   *
   * Synchronous Janus requests
   *
   **/

  private async createAudioRoom (description, roomId): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.audioBridgePlugin) {
          this.audioBridgePlugin.send({
            message: { request: 'create', room: roomId, description },
            success: () => {
              resolve()
            }
          })
        }
      } catch (error) {
        reject(`Error creating an audioBridge room: ${error}`)
      }
    })
  }

  private async createVideoRoom (description, roomId): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.videoRoomPlugin) {
          this.videoRoomPlugin.send({
            message: {
              request: 'create',
              room: roomId,
              description,
              publishers: 10,
              notify_joining: true
            },
            success: () => {
              resolve()
            }
          })
        }
      } catch (error) {
        reject(`Error creating a videoRoom room: ${error}`)
      }
    })
  }

  private async destroyAudioRoom (roomId): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.audioBridgePlugin) {
          this.audioBridgePlugin.send({
            message: { request: 'destroy', room: parseInt(roomId) },
            success: result => {
              // console.log(`::: audioPlugin - Room ${roomId} destroyed`, result)
              resolve()
            }
          })
        }
      } catch (error) {
        reject(`Error destroying an audioBridge room: ${error}`)
      }
    })
  }

  private async destroyVideoRoom (roomId): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.videoRoomPlugin) {
          this.videoRoomPlugin.send({
            message: { request: 'destroy', room: parseInt(roomId) },
            success: result => {
              // console.log(`::: videoPlugin - Room ${roomId} destroyed`, result)
              resolve()
            }
          })
        }
      } catch (error) {
        reject(`Error destroying a videoRoom room: ${error}`)
      }
    })
  }

  private getAudioRoomsList (): Promise<AudioRoom[]> {
    return new Promise<AudioRoom[]>((resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.audioBridgePlugin) {
          this.audioBridgePlugin.send({
            message: { request: 'list' },
            success: result => {
              const roomList = (result as MessageAudioSuccess).list as AudioRoom[]
              const rooms = new Array<AudioRoom>()
              for (let i = 0; i < roomList.length; i++) {
                if (roomList[i].room !== 1234 && roomList[i].room !== 5678) {
                  rooms.push(roomList[i])
                }
              }
              resolve(rooms)
            }
          })
        }
      } catch (error) {
        reject(`Error getting audio rooms list: ${error}`)
      }
    })
  }

  private getVideoRoomsList (): Promise<VideoRoom[]> {
    return new Promise<VideoRoom[]>((resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.videoRoomPlugin) {
          this.videoRoomPlugin.send({
            message: { request: 'list' },
            success: result => {
              const roomList = (result as MessageVideoSuccess).list as VideoRoom[]
              const rooms = new Array<VideoRoom>()
              for (let i = 0; i < roomList.length; i++) {
                if (roomList[i].room !== 1234 && roomList[i].room !== 5678) {
                  rooms.push(roomList[i])
                }
              }
              resolve(rooms)
            }
          })
        }
      } catch (error) {
        reject(`Error getting video rooms list: ${error}`)
      }
    })
  }

  private getVideoParticipantsList (roomId): Promise<Array<VideoParticipant>> {
    return new Promise<Array<VideoParticipant>>((resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.videoRoomPlugin) {
          this.videoRoomPlugin.send({
            message: { request: 'listparticipants', room: roomId },
            success: result => {
              resolve((result as MessageVideoParticipants).participants as Array<VideoParticipant>)
            }
          })
        }
      } catch (error) {
        reject(`Error retrieving video participants: ${error}`)
      }
    })
  }

  private getAudioParticipantsList (roomId): Promise<Array<AudioParticipant>> {
    return new Promise<Array<AudioParticipant>>((resolve, reject) => {
      try {
        // Send the request to Janus
        if (this.audioBridgePlugin) {
          this.audioBridgePlugin.send({
            message: { request: 'listparticipants', room: roomId },
            success: result => {
              resolve((result as MessageAudioParticipants).participants as Array<AudioParticipant>)
            }
          })
        }
      } catch (error) {
        reject(`Error retrieving audio participants: ${error}`)
      }
    })
  }

  /**
   * Function that requests Janus to mute/unmute the audio coming from audioBridge.
   */
  mute (muted: boolean): void {
    if (this.webrtcUp) {
      const message = {
        request: 'configure',
        muted
      }
      this.audioBridgePlugin &&
        this.audioBridgePlugin.send({
          message,
          success: () => {
            console.log(muted ? '::: audioPlugin - Muting' : '::: audioPlugin - Unmuting')
          }
        })
    }
  }

  /**
   *
   * Asynchronous Janus requests
   *
   **/

  /**
   * AUDIOBRIDGE plugin
   * Join an audio room to allow audio chat
   * @param options User audio options
   * @param room (Optional) Number room to join.
   */
  joinAudioRoom (options: JoinAudioOptions, room?: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.audioOptions = options
        const roomToJoin = room || this.AUDIO_ROOM_DEFAULT
        const { display, muted } = options
        const message = {
          request: 'join',
          room: roomToJoin,
          display,
          muted
        }
        this.audioBridgePlugin &&
          this.audioBridgePlugin.send({
            message,
            success: () => {
              resolve(true)
            }
          })
      } catch (error) {
        reject(false)
      }
    })
  }

  /**
   * VIDEOROOM plugin
   * Join a video room
   * @param options User video options
   * @param room (Optional) Number room to join.
   */
  joinVideoRoom (options: JoinVideoOptions, room?: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
          const roomToJoin = room || this.VIDEO_ROOM_DEFAULT
          const { display, ptype } = options
          let message
        if (this.userIsGuide) {
          message = {
            request: 'join',
            display,
            ptype,
            room: roomToJoin
          }
        } else {
          message = {
            request: 'joinandconfigure',
            display,
            ptype,
            room: roomToJoin,
            audio: false,
            video: true
          }
        }
        this.videoRoomPlugin &&
          this.videoRoomPlugin.send({
            message,
            success: () => {
              resolve(true)
            },
            error: error => {
              console.error('::: videoPlugin - Error', error)
              resolve(false)
            }
          })
      } catch (error) {
        reject(false)
      }
    })
  }

  /**
   * TEXTROOM plugin
   * Join a text room
   * @param room (Optional) Number room to join. By default is 1234.
   */
  joinTextRoom (options: JoinTextOptions, room?: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        const roomToJoin = room || this.TEXT_ROOM_DEFAULT
        const { display, username } = options
        const message = {
          textroom: 'join',
          transaction: this.randomString(12),
          room: roomToJoin,
          username,
          display
        }
        this.textRoomPlugin &&
          this.textRoomPlugin.data({
            text: JSON.stringify(message),
            success: () => {
              resolve(true)
            },
            error: error => {
              console.error('::: textPlugin - Error', error)
              reject(false)
            }
          })
      } catch (error) {
        reject(false)
      }
    })
  }

  /**
   * Function that requests Janus to send or stop sending the video from videoRoom.
   */
  subscribeToPublisher (publisherId: number, roomId: number): boolean {
    // Check if the plugin handle for the subscription of that publisher has been created
    // If not, create a new handler and add it to the andler list by its publisher id
    let result = false
    if (!(publisherId in this.subscriptionHandlers)) {
      if (Object.keys(this.subscriptionHandlers).length < MAX_SUBSCRIPTIONS) {
        this.attachVideoSubscriberPlugin(publisherId).then(() => {
          const pluginHandle = this.subscriptionHandlers[publisherId]
          if (pluginHandle) {
            const message = {
              request: 'join',
              room: roomId,
              ptype: 'subscriber',
              feed: publisherId
            }
            pluginHandle.send({ message })
          } else {
            console.error('There has been an error getting the plugin handle')
          }
          result = true
        })
      } else {
        console.error('Error: maximum number of subscriptions reached.')
        result = false
      }
    } else {
      // There already exist a handler for this subscription
      result = true
      // ????
    }
    return result
  }

  unsubscribeFromPublisher (publisherId: number): void {
    const pluginHandle = this.subscriptionHandlers[publisherId]
    if (pluginHandle) {
      const message = {
        request: 'unsubscribe',
        streams: [ { feed: publisherId } ]
      }
      pluginHandle.send({ message })
      pluginHandle.hangup()
      // Delete the feed from the active feed list
      if (this.activeFeedList[this.activeFeedList.indexOf(publisherId)]) {
        this.activeFeedList[this.activeFeedList.indexOf(publisherId)] = 0
      }
      delete this.subscriptionHandlers[publisherId]
    }
  }

  publishOwnFeed (): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        // Create sdp offer info and send the request with it
        this.videoRoomPlugin &&
          this.videoRoomPlugin.createOffer({
            media: { audioRecv: false, videoRecv: false, audioSend: false, videoSend: true }, // Publishers are sendonly
            success: jsep => {
              this.videoRoomPlugin &&
                this.videoRoomPlugin.send({
                  message: { request: 'configure', audio: false, video: true },
                  jsep,
                  success: () => {
                    resolve(true)
                  },
                  error: error => {
                    console.error('::: videoPlugin - Error', error)
                    resolve(false)
                  }
                })
            },
            error: console.error
          })
      } catch (error) {
        reject(false)
      }
    })
  }

  unpublishOwnFeed (): void {
    try {
      const unpublish = { request: 'unpublish' }
      this.videoRoomPlugin && this.videoRoomPlugin.send({ message: unpublish })
    } catch (error) {
      console.error(error)
    }
  }

  rtpForward (room: number, publisher_id: number): void {
    try {
      const message = {
        request: 'rtp_forward',
        room,
        publisher_id,
        host: '192.168.10.111',
        host_family: 'ipv4',
        // audio_port: 10033, 
        // audiopt: 111, 
        video_port: 6002, 
        videopt: 100,
        // streams: [ { mid: 'video test', host: '192.168.10.111', port: 12345 } ]
      }
      this.videoRoomPlugin &&
        this.videoRoomPlugin.send({
          message,
          success: result => {
            console.log('::: videoPlugin - RTP forwarding', result)
          },
          error: error => {
            console.error('::: videoPlugin - RTP forwarding ERROR:', error)
          }
        })
    } catch (error) {
      console.error('Error rtp forwarding: ', error)
    }
  }

  getForwarders (room: number): void {
    console.log('Getting rtp forwarders from room', room)
    try {
      const message = {
        request: 'listforwarders',
        room
      }
      this.videoRoomPlugin &&
        this.videoRoomPlugin.send({
          message,
          success: result => {
            console.log(`::: videoPlugin - Forwarders of room ${room}:`, result)
          }
        })
    } catch (error) {
      console.error('Error getting forwarders: ', error)
    }
  }

  /**
   * AUDIOBRIDGE plugin
   * Change to another audioBridge room
   * @param room (Optional) Number room to join. By default is 1234
   */
  private switchAudioRoom (user: Participant, room: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        const roomToJoin = room || this.AUDIO_ROOM_DEFAULT
        const message = {
          request: 'changeroom',
          room: roomToJoin,
          display: user.display,
          muted: true
        }
        this.audioBridgePlugin &&
          this.audioBridgePlugin.send({
            message,
            success: () => {
              console.log(`::: audioPlugin - Switching to room ${roomToJoin.toString()}`)
              resolve(true)
            }
          })
      } catch (error) {
        reject(false)
      }
    })
  }

  private leaveVideoRoom (room: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const message = {
          request: 'leave'
        }
        this.videoRoomPlugin &&
          this.videoRoomPlugin.send({
            message,
            success: () => {
              console.log('::: videoPlugin - Leaving room', room)
              resolve(true)
            },
            error: error => {
              console.error('::: videoPlugin - Error leaving room:', error)
            }
          })
        resolve(true)
      } catch (error) {
        reject(false)
      }
    })
  }

  /**
   *
   * Rest of the methods
   *
   **/

  reAttachMediaStreams(): void {
    // console.log('The saved audio Stream is:', this.audioStream)
    // console.log('The saved media Streams are:', this.mediaStreams)
    // console.log('The active ones should be:', this.activeFeedList)

    // Re-attach the audio stream
    // Janus.attachMediaStream(this.audioElement, this.audioStream)
    // Re-attach the video streams (only the active ones)
    // for (let i = 0; i < this.activeFeedList.length; i++) {
    //   if(this.activeFeedList[i] !== 0) {
    //     const publisherId = this.activeFeedList[i]
    //     const videoStream = this.mediaStreams[publisherId]
    //     if (i === 0) {
    //       Janus.attachMediaStream(this.videoElement1, videoStream)
    //     } else if (i === 1) {
    //       Janus.attachMediaStream(this.videoElement2, videoStream)
    //     } else if (i === 2) {
    //       Janus.attachMediaStream(this.videoElement3, videoStream)
    //     }
    //   }
    // }
    // Re-attach media streams
    Janus.reattachMediaStream(this.newAudioElement, this.audioElement)
    Janus.reattachMediaStream(this.newVideoElement1, this.videoElement1)
    Janus.reattachMediaStream(this.newVideoElement2, this.videoElement2)
    Janus.reattachMediaStream(this.newVideoElement3, this.videoElement3)
    this.audioElement = this.newAudioElement
    this.videoElement1 = this.newVideoElement1
    this.videoElement2 = this.newVideoElement2
    this.videoElement3 = this.newVideoElement3
  }

  private async switchRoom (user: Participant, source: number, destination: number) {
    // Audiobridge has the changeroom request to easily change rooms
    await this.switchAudioRoom(user, destination)
    // Videoroom will require to make a leave-join-publish round to change rooms
    await this.switchVideoRoom(user, source, destination)
  }

  /**
   * VIDEOROOM plugin
   * Change to another videoRoom room
   */
  private switchVideoRoom (user: Participant, sourceRoom: number, destinationRoom: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        console.log(`::: videoRoom - Switching to room ${destinationRoom.toString()}`)
        // When the event from Janus is received, join the new room, for that,
        // store the destination room in the 'pendingToSwitch' variable.
        this.pendingToSwitch = {
          destinationId: destinationRoom,
          display: user.display
        } as SwitchRequest
        // Leave the current video room
        this.leaveVideoRoom(sourceRoom)
        resolve(true)
      } catch (error) {
        reject(false)
      }
    })
  }

  sendWhisper (to: string, text: string): void {
    if (to) {
      const message = {
        textroom: 'message',
        transaction: this.randomString(12),
        room: this.TEXT_ROOM_DEFAULT,
        to,
        text
      }
      this.textRoomPlugin &&
        this.textRoomPlugin.data({
          text: JSON.stringify(message),
          success: () => {
            // console.log(`::: textPlugin - Text message sent to ${to}:`, text)
          },
          error: result => {
            console.error(result)
          }
        })
    }
  }

  setAudio (audioElement: HTMLAudioElement): void {
    this.audioElement = audioElement
  }

  setNewAudio (audioElement: HTMLAudioElement): void {
    this.newAudioElement = audioElement
  }

  setVideo (videoElement1: HTMLVideoElement, videoElement2: HTMLVideoElement, videoElement3: HTMLVideoElement): void {
    if (!this.videoElement1) {
      this.videoElement1 = videoElement1
    }
    if (!this.videoElement2) {
      this.videoElement2 = videoElement2
    }
    if (!this.videoElement3) {
      this.videoElement3 = videoElement3
    }
  }

  setNewVideo (videoElement1: HTMLVideoElement, videoElement2: HTMLVideoElement, videoElement3: HTMLVideoElement): void {
    this.newVideoElement1 = videoElement1
    this.newVideoElement2 = videoElement2
    this.newVideoElement3 = videoElement3
  }

  setUserIsGuide (isGuide: boolean): void {
    this.userIsGuide = isGuide
  }

  loadUser (userName: string): void {
    let user: Participant = {}
    if (this.rooms) {
      for (let i = 0; i < this.rooms.length; i++) {
        if (this.rooms[i].participants) {
          for (let j = 0; j < this.rooms[i].participants!.length; j++) {
            const participant = this.rooms[i].participants![j]
            if (participant.display === userName) {
              user = participant as Participant
              user.room = this.rooms[i].roomId
              this.user = user
              this.onUser.next(this.user)
              break
            }
          }
        }
      }
    }
    if (!this.user || (this.user && !this.user.display)) {
      user.display = userName
      this.user = user
      this.onUser.next(this.user)
    }
  }

  async getChatInfo (): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Rooms
        const audioRooms: Array<AudioRoom> = await this.getAudioRoomsList()
        const videoRooms: Array<VideoRoom> = await this.getVideoRoomsList()
        // Arrange results to group rooms by Id
        const rooms = new Array<Room>()
        let index = -1
        for (let i = 0; i < audioRooms.length; i++) {
          rooms.push({
            roomId: audioRooms[i].room,
            description: audioRooms[i].description,
            audioRoom: audioRooms[i],
            videoRoom: undefined
          })
        }
        for (let i = 0; i < videoRooms.length; i++) {
          for (let j = 0; j < rooms.length; j++) {
            if (rooms[j].roomId === videoRooms[i].room) {
              index = j
            }
          }
          if (index >= 0) {
            rooms[index].videoRoom = videoRooms[i]
          } else {
            rooms.push({
              roomId: videoRooms[i].room,
              description: videoRooms[i].description,
              audioRoom: undefined,
              videoRoom: videoRooms[i]
            })
          }
          index = -1
        }

        // Update this.rooms to use it in this.loadParticipants to retrieve the room participants
        this.rooms = rooms

        // Participants
        await this.loadParticipants()

        // Create one participant list
        let participants = new Array<Participant>()
        let audioParticipants = new Array<AudioParticipant>()
        let videoParticipants = new Array<VideoParticipant>()
        for (let i = 0; i < rooms.length; i++) {
          participants = new Array<Participant>()
          // Audio participants
          // We check againts this.rooms and not rooms because partipant data has been updated in this.rooms
          if (this.rooms[i].audioRoom && this.rooms[i].audioRoom?.participants) {
            audioParticipants = this.rooms[i].audioRoom?.participants as Array<AudioParticipant>
            index = -1
            for (let a = 0; a < audioParticipants.length; a++) {
              index = participants.findIndex(p => p.display === audioParticipants[a].display)
              if (index >= 0) {
                participants[index].audioId = audioParticipants[a].id
                participants[index].setup = audioParticipants[a].setup
                participants[index].muted = audioParticipants[a].muted
              } else {
                participants.push({
                  audioId: audioParticipants[a].id,
                  display: audioParticipants[a].display,
                  setup: audioParticipants[a].setup,
                  muted: audioParticipants[a].muted
                } as Participant)
              }
            }
          }
          // Video participants
          if (this.rooms[i].videoRoom && this.rooms[i].videoRoom?.participants) {
            videoParticipants = this.rooms[i].videoRoom?.participants as Array<VideoParticipant>
            index = -1
            for (let v = 0; v < videoParticipants.length; v++) {
              index = participants.findIndex(p => p.display === videoParticipants[v].display)
              if (index >= 0) {
                participants[index].videoId = videoParticipants[v].id
                participants[index].publisher = videoParticipants[v].publisher
              } else {
                participants.push({
                  videoId: videoParticipants[v].id,
                  display: videoParticipants[v].display,
                  publisher: videoParticipants[v].publisher
                } as Participant)
              }
            }
          }
          this.rooms[i].participants = participants.sort(this.compare)
        }
        resolve()
      } catch (error) {
        reject(`Could not get the chat status info: ${error}`)
      }
    })
  }

  async createRoom (description: string, roomId: number): Promise<any[]> {
    return Promise.all([ this.createAudioRoom(description, roomId), this.createVideoRoom(description, roomId) ])
  }

  async destroyRoom (roomId: number): Promise<any[]> {
    return Promise.all([ this.destroyAudioRoom(roomId), this.destroyVideoRoom(roomId) ])
  }

  private async loadParticipants (): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        for (let i = 0; i < this.rooms.length; i++) {
          const audioParticipants: Array<AudioParticipant> = await this.getAudioParticipantsList(this.rooms[i].roomId)
          const videoParticipants: Array<VideoParticipant> = await this.getVideoParticipantsList(this.rooms[i].roomId)
          this.rooms[i].audioRoom!.participants = audioParticipants
          this.rooms[i].videoRoom!.participants = videoParticipants
        }
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private onIceState (state: unknown): void {
    Janus.log(`ICE state changed to ${state}`)
  }

  private onMediaState (medium: 'audio' | 'video', receiving?: boolean): void {
    Janus.log(`Janus ${receiving ? 'started' : 'stopped'} receiving our ${medium}`)
  }

  private onSlowLink (uplink: boolean, lost: boolean, mid: string): void {
    Janus.warn(
      `Janus reports problems ${uplink ? 'sending' : 'receiving'} packets on mid ${mid} (${lost} lost packets)`
    )
  }

  private onWebrtcState (isConnected: boolean): void {
    Janus.log(`Janus says our WebRTC PeerConnection is ${isConnected ? 'up' : 'down'} now`)
  }

  private onMessageAudio (message, jsep): void {
    const { audiobridge: event } = message
    if (event) {
      switch (event) {
        case MessagesType.MESSAGE_JOINED: {
          this.onJoinAudio(message as MessageAudioJoin)
          break
        }
        case MessagesType.MESSAGE_DESTROYED: {
          this.onDestroy(message)
          break
        }
        case MessagesType.MESSAGE_EVENT: {
          this.onAudioEvent(message)
          break
        }
        case MessagesType.MESSAGE_CHANGEROOM: {
          this.onAudioChangeRoom(message)
          break
        }
        case MessagesType.MESSAGE_STOP_TALKING:
        case MessagesType.MESSAGE_TALKING: {
          this.onTalkingEvent(message as MessageTalkEvent)
          break
        }
      }
    }
    if (jsep) {
      Janus.log('Handling SDP as well...', jsep)
      this.audioBridgePlugin && this.audioBridgePlugin.handleRemoteJsep({ jsep })
    }
  }

  private onMessageVideo (message, jsep): void {
    const { videoroom: msgType } = message
    if (msgType) {
      switch (msgType) {
        case MessagesType.MESSAGE_JOINED: {
          this.onJoinVideo(message as MessageVideoJoin)
          break
        }
        case MessagesType.MESSAGE_DESTROYED: {
          this.onDestroy(message as MessageVideoJoin)
          break
        }
        case MessagesType.MESSAGE_EVENT: {
          this.onVideoEvent(message as MessageVideoJoin)
          break
        }
        case MessagesType.MESSAGE_RTPFORWARD: {
          console.log('RTP forward message', message, jsep)
          break
        }
      }
    }
    if (jsep) {
      Janus.log('Handling SDP as well...', jsep)
      this.videoRoomPlugin && this.videoRoomPlugin.handleRemoteJsep({ jsep })
    }
  }

  private onMessageVideoSubscriber (publisherId: number, message, jsep): void {
    const { videoroom: msgType } = message
    Janus.log('::: videoSuscriberPlugin - New message received', message, jsep)
    if (msgType) {
      switch (msgType) {
        case MessagesType.MESSAGE_ATTACHED: {
          this.onVideoAttached(message, jsep, publisherId)
          break
        }
        case MessagesType.MESSAGE_EVENT: {
          this.onVideoEvent(message)
          break
        }
        case MessagesType.MESSAGE_UPDATE: {
          this.onVideoUpdate(message)
          break
        }
      }
    }
    if (jsep) {
      Janus.log('Handling SDP as well...', jsep)
      const pluginHandle = this.subscriptionHandlers[publisherId]
      if (pluginHandle) {
        if (msgType === MessagesType.MESSAGE_ATTACHED) {
          pluginHandle.createAnswer({
            jsep,
            media: {
              audioSend: false,
              videoSend: false
            }, // Publishers are sendonly
            success: this.onReceiveSDPVideoRoomSubscriber.bind(this, publisherId),
            error (error) {
              Janus.log('WebRTC error:', error)
            }
          })
        } else {
          pluginHandle.handleRemoteJsep({ jsep })
        }
      }
    }
  }

  private onLocalAudioTrack (track: MediaStreamTrack, on: boolean): void {
    Janus.log('::: Got a local audio stream :::')
    Janus.log(track)
  }

  private onLocalVideoTrack (track: MediaStreamTrack, on: boolean) {
    if (!this.userIsGuide) {
      Janus.log(`Local track ${on ? 'added' : 'removed'}:`, track)
      // We use the track ID as name of the element, but it may contain invalid characters
      const trackId = track.id.replace(/[{}]/g, '')
      let stream
      if (!on) {
        // Track removed, get rid of the stream and the rendering
        stream = this.localTracks[trackId]
        if (stream) {
          try {
            const tracks = stream.getTracks()
            for (const i in tracks) {
              const mst = tracks[i]
              if (mst !== null && mst !== undefined) {
                mst.stop()
              }
            }
          } catch (e) {
            console.error(e)
          }
        }
        if (track.kind === 'video') {
          this.localVideos--
          if (this.localVideos === 0) {
            // No video, at least for now
          }
        }
        delete this.localTracks[trackId]
        return
      }
      // If we're here, a new track was added
      stream = this.localTracks[trackId]
      if (stream) {
        // We've been here already
        return
      }
      if (track.kind === 'audio') {
        // We ignore local audio tracks, they'd generate echo anyway
      } else {
        // New video track: create a stream out of it
        this.localVideos++
        stream = new MediaStream()
        stream.addTrack(track.clone())
        stream.mid = 'video test'
        this.localTracks[trackId] = stream
        Janus.attachMediaStream(this.videoElement1, stream)
        this.onMediattached.next(stream)
      }
    }
  }

  private onRemoteAudioTrack (track: MediaStreamTrack, mid: string, on: boolean): void {
    Janus.log(' ::: Got a remote audio stream :::')
    Janus.log(track)
    let remoteStream
    if(!on) {
      // Track removed, get rid of the stream and the rendering
      if(remoteStream) {
        try {
          var tracks = remoteStream.getTracks()
          for(var i in tracks) {
            var mst = tracks[i]
            if(mst)
              mst.stop()
          }
        } catch(e) {}
      }
      remoteStream = null
      return;
    }
    remoteStream = new MediaStream()
    remoteStream.addTrack(track.clone())
    this.audioStream = remoteStream
    Janus.attachMediaStream(this.audioElement, remoteStream)
    this.onMediattached.next(remoteStream)
  }

  private onRemoteVideoTrack (track: MediaStreamTrack, mid: string, on: boolean) {
    if (this.userIsGuide) {
      console.log('remote track received', track, mid, on)
      // Janus.attachMediaStream(this.videoElement1, stream)
    }
  }

  private onRemoteVideoSubscriberTrack (publisherId: number, track: MediaStreamTrack, mid: string, on: boolean): void {
    if (this.userIsGuide) {
      Janus.log('::: Got a remote video stream :::')
      const remoteFeed = this.subscriptionHandlers[publisherId]
      if (remoteFeed) {
        if(!on) {
          // Track removed, get rid of the stream and the rendering
          var stream = remoteFeed.remoteTracks[mid]
          if(stream) {
            try {
              var tracks = stream.getTracks()
              for(var i in tracks) {
                var mst = tracks[i]
                if(mst !== null && mst !== undefined)
                  mst.stop()
              }
            } catch(e) {}
          }
          if(track.kind === 'video') {
            remoteFeed.remoteVideos--
            if(remoteFeed.remoteVideos === 0) {
              // No video, at least for now
            }
          }
          delete remoteFeed.remoteTracks[mid];
          return;
        }

        if(track.kind === 'audio') {
          // Ignoring audio tracks
        } else {
          // New video track: create a stream out of it
          remoteFeed.remoteVideos++
          stream = new MediaStream()
          stream.addTrack(track.clone())
          remoteFeed.remoteTracks[mid] = stream
          const index = this.activeFeedList.indexOf(publisherId)
          this.mediaStreams[publisherId] = stream
          if (index.toString()) {
            if (index === 0) {
              Janus.attachMediaStream(this.videoElement1, stream)
            } else if (index === 1) {
              Janus.attachMediaStream(this.videoElement2, stream)
            } else if (index === 2) {
              Janus.attachMediaStream(this.videoElement3, stream)
            }
            this.onMediattached.next(stream)
          }
        }
      } else {
        console.error('There is no remote feed for publisher', publisherId)
      }
    }
  }

  private onMessageText (message, jsep) {
    Janus.log(' ::: textPlugin - Got a message :::', message)
    if (message.error) {
      console.error('::: textPlugin - Error', message.error)
    }
    if (jsep) {
      // Answer
      this.textRoomPlugin!.createAnswer({
        jsep,
        media: { audio: false, video: false, data: true }, // We only use datachannels
        success: pJsep => {
          Janus.log('Got SDP!', pJsep)
          const body = { request: 'ack' }
          this.textRoomPlugin!.send({ message: body, jsep: pJsep })
        },
        error: error => {
          Janus.error('WebRTC error:', error)
        }
      })
    }
  }

  private async onDataOpen () {
    await this.joinTextRoom({ display: this.user?.display, username: this.user?.display }, this.TEXT_ROOM_DEFAULT)
  }

  private onData (data) {
    const json = JSON.parse(data)
    // var transaction = json['transaction']
    // if (transactions[transaction]) {
    //   // Someone was waiting for this
    //   transactions[transaction](json)
    //   delete transactions[transaction]
    //   return
    // }
    const what = json.textroom
    const msg = this.escapeXmlTags(json.text)
    const whisper = json.whisper
    // var from = json['from']
    // var dateString = this.getDateString(json['date'])
    // var sender = this.escapeXmlTags(json['display'])
    // var display = json['display']
    const username = json.username

    if (what === 'message') {
      // Incoming message: public or private?
      if (whisper === true) {
        // Private message
        const orderParams = msg.split('|')
        if (orderParams.length > 0) {
          const orderWhat = orderParams[0]
          if (orderWhat === 'switchRooms') {
            const originId = orderParams[1]
            const destinationId = orderParams[2]
            // trigger the room switch here
            this.switchRoom(this.user, Number(originId), Number(destinationId))
          } else if (orderWhat === 'newRoom') {
            this.onChange.next(this.rooms)
          } else if (orderWhat === 'roomDestroyed') {
            this.onChange.next(this.rooms)
          } else if ('joinedChat') {
            this.onChange.next(this.rooms)
          }
        }
      } else {
        // Public message
        console.log('::: textPlugin - A public message arrived :::', msg)
      }
    } else if (what === 'announcement') {
      console.log('::: textPlugin - An announcement message arrived :::', msg)
    } else if (what === 'join') {
      // Somebody joined
      // console.log('::: textPlugin - Somebody joined the text room :::', username)
    } else if (what === 'leave') {
      // Somebody left
      // console.log('::: textPlugin - Somebody left the text room :::')
    } else if (what === 'kicked') {
      // Somebody was kicked
      console.log('::: textPlugin - Somebody was kicked from the text room :::', username)
    } else if (what === 'destroyed') {
      // Room was destroyed, goodbye!
      Janus.warn('::: textPlugin - The room has been destroyed!')
    }
  }

  private onCleanUp (): void {
    Janus.log('Cleanup notification')
    // this.webrtcUp = false
    // if (this.user && this.user.videoId) {
    //   delete this.feedStreams[this.user.videoId]
    // }
  }

  /**
   * AUDIOBRIDGE plugin
   * When it receives a message from Janus with event 'joined'.
   * The message is received when the user is joined and others user are joined.
   * @param message // Message received
   */
  private onJoinAudio (message: MessageAudioJoin): void {
    const { id, participants, room } = message
    if (id) {
      Janus.log(`::: audioPlugin - Successfully joined room ${room} with ID ${id}`)
      if (this.user) {
        this.user.audioId = id
      }
    } else {
      Janus.log(`::: audioPlugin - New participant joined room ${room}`)
    }

    if (!this.webrtcUp) {
      this.webrtcUp = true
    }

    this.createOfferAudioBridge()

    if (participants && participants.length > 0) {
      this.addParticipants(room, participants as Array<AudioParticipant>)
    }
  }

  /**
   * VIDEOROOM plugin
   * When it receives a message from Janus with event 'joined'.
   * The message is received when the user is joined and others user are joined.
   * @param message // Message received
   */
  private onJoinVideo (message: MessageVideoJoin): void {
    const { id, publishers, room } = message
    Janus.log(`::: videoPlugin - Successfully joined room ${room} with ID ${id}`)
    if (id) {
      // If the join event comes with id, its me that joined
      if (this.user) {
        this.user.videoId = id
      }
      
      if (!this.userIsGuide) {
        // After joining the room, we publish our own feed
        this.createOfferVideoRoom()
      }
    }
    if (!this.webrtcUp) {
      this.webrtcUp = true
    }

    // Add new publishers to the publisher list
    if (publishers && publishers.length > 0) {
      // Collect publishers streams
      for (const pub of publishers) {
        this.feedStreams[pub.id] = pub.streams
      }
      // Update changes in the chat component
      this.onPublishers.next(this.feedStreams)
    }
  }

  /**
   * When it receives a message from Janus with event 'destroy'
   * The message is received when the room has been destroyed
   * @param message // Message received
   */
  private onDestroy (message: unknown): void {
    console.error('The room has been destroyed', message)
  }

  /**
   * AUDIOBRIDGE plugin
   * When it receives a message from Janus with an event from audioBridge
   * @param message // Message received
   */
  private onAudioEvent (message): void {
    const { participants, error, leaving, room, result } = message
    Janus.log(`::: audioPlugin - Received an event ${message}`)

    if (participants && participants.length > 0) {
      this.addParticipants(room, participants as Array<AudioParticipant>)
    }

    if (leaving) {
      if (leaving !== 'ok') {
        // console.log(`::: audioPlugin - User with ID ${leaving} left the audioRoom`, leaving)
      } else {
        console.log(`::: audioPlugin - You left the audioRoom`, leaving)
      }
      // Remove the user from the "rooms" object
      this.removeParticipant(room, leaving)
    }

    if (result && result === 'ok') {
      Janus.log(`::: audioPlugin - You configured your media`)
      this.onChange.next(this.rooms)
    }

    if (error) {
      console.error(error)
    }
  }

  /**
   * AUDIOBRIDGE plugin
   * When it receives a message from Janus with an changeroom message from audioBridge
   * @param message // Message received
   */
  private onAudioChangeRoom (message): void {
    // const { participants, error, display, room } = message
    Janus.log(`::: audioPlugin - Received a changeroom message ${message}`)
    // Refresh the info from the server
    this.getChatInfo()
  }

  /**
   * VIDEOROOM plugin
   * When it receives a message from Janus with an event from videoRoom
   * @param message // Message received
   */
  private async onVideoEvent (message): Promise<boolean> {
    return new Promise<boolean>( async(resolve, reject) => {
      const { publishers, streams, error, joining, leaving, room, configured, unpublished } = message
      Janus.log(`::: videoPlugin - Received an event ${message}`)
      if (streams) {
        if (this.user && this.user.videoId) {
          const userId = this.user.videoId
          for (const stream of streams) {
            stream.id = userId
          }
          this.feedStreams[userId] = streams
        }
      }

      if (publishers && publishers.length > 0) {
        this.addPublishers(room, publishers as Array<Publisher>)
        // Collect publishers streams
        for (const publisher of publishers) {
          this.feedStreams[publisher.id] = publisher.streams
        }
      }

      if (joining) {
        // console.log(`::: videoPlugin - ${joining.display} joined ${room}`)
        this.onChange.next(this.rooms)
      }

      if (leaving) {
        if (leaving !== 'ok') {
          // console.log(`::: videoPlugin - User with ID ${leaving} left the videoRoom`, leaving)
          // Delete the feed from the active feed list
          if (this.activeFeedList[leaving]) {
            this.activeFeedList[this.activeFeedList.indexOf(leaving)] = 0
          }
          delete this.feedStreams[leaving]
          this.onChange.next(this.rooms)
        } else {
          // This participant left the room
          // console.log(`::: videoPlugin - You left the videoRoom`)
          // Check if there is a pending switch order
          if (this.pendingToSwitch) {
            const { display, destinationId: roomId } = this.pendingToSwitch
            this.videoRoomPlugin?.hangup() // hangup videoroom handler
            await this.attachVideoRoomPlugin()
            display && roomId && this.joinVideoRoom({ display, ptype: 'publisher' }, roomId)
            this.pendingToSwitch = undefined
          }
          this.onChange.next(this.rooms)
        }
      }

      if (configured && configured === 'ok') {
        Janus.log(`::: videoPlugin - You configured your media`)
      }

      if (unpublished) {
        if (unpublished === 'ok') {
          // console.log(`::: videoPlugin - You stopped publishing`)
          this.videoRoomPlugin && this.videoRoomPlugin.hangup()
        } else {
          if (room) {
            // console.log(`::: videoPlugin - ${unpublished} stopped publishing in ${room}`)
            delete this.feedStreams[unpublished]
            this.onUnpublish.next(Number(unpublished))
            // this.onChange.next(this.rooms)
          }
        }
      }

      if (error) {
        console.error(error)
      }
      resolve(true)
    })
  }

  /**
   * VIDEOROOM plugin
   * When it receives a message from Janus with event 'updated'
   * The message is received when a subscription to a publisher is made.
   * @param message // Message received
   */
  private onVideoAttached (message, jsep, publisherId: number): void {
    Janus.log(`Received a media attachment ${message}`)
    // Subscription has been completed
    // Put the feed in the activeFeedList list
    for (let i = 0; i < this.activeFeedList.length; i++) {
      if (this.activeFeedList[i] === 0) {
        this.activeFeedList[i] = publisherId
        break
      }
    }

    // Update the list in the chat component
    this.onVideoFeedUpdate.next(this.activeFeedList)
  }

  /**
   * VIDEOROOM plugin
   * When it receives a message from Janus with event 'updated'
   * The message is received when a subscription to a publisher is updated.
   * @param message // Message received
   */
  private onVideoUpdate (message): void {
    const { streams } = message
    Janus.log(`Received an update ${message}`)
    if (streams && streams.length > 0) {
      Janus.attachMediaStream(this.videoElement1, streams[0])
    }
  }

  /**
   * When it receives a message from Janus with event 'talking' or 'stopped-talking'
   * The message is received when other user is talking or stops talking.
   * @param message // Message received
   */
  private onTalkingEvent (message: MessageTalkEvent): void {
    const { id, audiobridge: event } = message
    Janus.log(`User with id ${id} is ${event}`)
    console.log(`User with id ${id} is ${event}`)
    switch (event) {
      case MessagesType.MESSAGE_TALKING: {
        this.onTalking.next(message)
        break
      }
      case MessagesType.MESSAGE_STOP_TALKING: {
        this.onStopTalking.next(message)
        break
      }
    }
  }

  private createOfferAudioBridge (): void {
    this.audioBridgePlugin &&
      this.audioBridgePlugin.createOffer({
        media: { video: false },
        success: this.onReceiveSDPAudioBridge.bind(this),
        error: console.error
      })
  }

  private onReceiveSDPAudioBridge (jsep): void {
    const { muted } = this.audioOptions
    const message = {
      request: 'configure',
      muted
    }
    this.audioBridgePlugin && this.audioBridgePlugin.send({ message, jsep })
  }

  private createOfferVideoRoom (): void {
    this.videoRoomPlugin &&
      this.videoRoomPlugin.createOffer({
        media: { videoSend: true }, // Publishers are sendonly
        success: this.onReceiveSDPVideoRoom.bind(this),
        error: console.error
      })
  }

  private onReceiveSDPVideoRoom (jsep): void {
    const message = { request: 'configure', audio: false, video: true }
    this.videoRoomPlugin && this.videoRoomPlugin.send({ message, jsep })
  }

  private onReceiveSDPVideoRoomSubscriber (publisherId, jsep): void {
    Janus.log('Got publisher SDP!')
    Janus.log(jsep)
    const request = { request: 'start', room: 1234 }
    const pluginHandle = this.subscriptionHandlers[publisherId]
    if (pluginHandle) {
      pluginHandle.send({ message: request, jsep })
    }
  }

  private addParticipants (roomId: number, participants: Array<AudioParticipant>): void {
    const filteredRoom = this.rooms.filter(r => r.roomId === roomId)
    if (filteredRoom.length === 1) {
      const room = filteredRoom[0]
      if (room && room.audioRoom && room.audioRoom.participants && room.audioRoom.participants.length > 0) {
        participants.forEach(participant => {
          if (room && room.audioRoom && room.audioRoom.participants) {
            const exist = room.audioRoom.participants.some(user => user.id === participant.id)

            if (!exist) {
              room.audioRoom.participants.push(participant)
            } else {
              room.audioRoom.participants = room.audioRoom.participants.map<AudioParticipant>(
                (user: AudioParticipant) => {
                  if (user.id === participant.id) {
                    // Merge target user with source publisher
                    return Object.assign(user, participant)
                  }
                  return user
                }
              )
            }
          }
        })
      }
    } else {
      console.error('Error: room not found')
    }
    // Update changes in the chat component
    this.onParticipants.next(this.rooms)
  }

  private addPublishers (roomId: number, publishers: Array<VideoParticipant>): void {
    const filteredRoom = this.rooms.filter(r => r.roomId === roomId)
    if (filteredRoom.length === 1) {
      const room = filteredRoom[0]
      if (room && room.videoRoom && room.videoRoom.participants && room.videoRoom.participants.length > 0) {
        // Add publishers if they are not present in the participants
        publishers.forEach(publisher => {
          if (room && room.videoRoom && room.videoRoom.participants) {
            const exist = room.videoRoom.participants.some(user => user.id === publisher.id)
            if (!exist) {
              room.videoRoom.participants.push(publisher)
            } else {
              room.videoRoom.participants = room.videoRoom.participants.map<VideoParticipant>(
                (user: VideoParticipant) => {
                  if (user.id === publisher.id) {
                    // Merge target user with source publisher
                    return Object.assign(user, publisher)
                  }
                  return user
                }
              )
            }
          }
        })
      }
    } else {
      console.error('Error: room not found')
    }
    // Update changes in the chat component
    this.onPublishers.next(this.rooms)
  }

  private removeParticipant (roomId: number, leavingId: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        let userId = leavingId
        // The leaving user is him/herself
        if (leavingId.toString() === 'ok') {
          if (this.user && this.user.audioId) {
            userId = this.user.audioId
          }
        }
        const index = this.rooms
          .map(r => {
            return r.roomId
          })
          .indexOf(roomId)
        if (this && this.rooms && this.rooms[index] && this.rooms[index].participants) {
          this.rooms[index].participants = this.rooms[index].participants?.filter(participant => {
            return participant.audioId !== userId
          })
          this.rooms[index].audioRoom!.participants = this.rooms[index].audioRoom?.participants?.filter(participant => {
            return participant.id !== userId
          })
        }
        // Update changes in the chat component
        this.onParticipants.next(this.rooms)
        resolve(true)
      } catch (error) {
        reject(false)
      }
    })
  }

  private escapeXmlTags (value) {
    if (value) {
      let escapedValue = value.replace(new RegExp('<', 'g'), '&lt')
      escapedValue = escapedValue.replace(new RegExp('>', 'g'), '&gt')
      return escapedValue
    }
  }

  // Helper method to create random identifiers (e.g., transaction)
  private randomString (len) {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let randomString = ''
    for (let i = 0; i < len; i++) {
      const randomPoz = Math.floor(Math.random() * charSet.length)
      randomString += charSet.substring(randomPoz, randomPoz + 1)
    }
    return randomString
  }

  private compare = (a, b) => {
    if (a.display < b.display) {
      return -1
    }
    if (a.display > b.display) {
      return 1
    }
    return 0
  }
}

export { JanusClient }
