import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Grid, GridItem } from '../../layout/Grid'
import { Participant, Room } from '../../utils/janus/janus.types'
import Loader from 'react-loader-spinner'
import MultiTableDrag from './multi-table-drag/multi-table-drag'

import { useNavigate } from 'react-router-dom'

import UserService from '../../utils/user-service'

import './chat-room.scss'
import '../../scss/button.scss'

import configData from '../../../config.json'
import { useStore } from '../../context/context'
import ArtworkSelector from '../artwork/artwork-selector'
import VideoCanvas from './canvas/video-canvas'

const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT

const ACTION_SET_JANUS_CLIENT = 'setJanusClient'
const REMOVE_JANUS_CLIENT = 'removeJanusClient'

const janusClientReducer = (state, action) => {
  switch (action.type) {
    case ACTION_SET_JANUS_CLIENT: {
      return { janusClient: action.payload }
    }
    case REMOVE_JANUS_CLIENT: {
      return { janusClient: null }
    }
  }
}

interface MultiTableProps {
  items: any[]
  roomIds: number[]
  rooms: any[]
}

const ChatRoom: React.FC = () => {
  // Utils
  const queryParams = new URLSearchParams(window.location.search)
  const navigate = useNavigate()

  // Janus client info
  const isJanusEnabled = useStore(state => state.isJanusEnabled)
  const setIsJanusEnabled = useStore(state => state.setIsJanusEnabled)
  const [state, dispatch] = useReducer(janusClientReducer, {
    janusClient: null
  })

  // User info
  const username = queryParams.get('name') || 'GUEST'
  const uwbId = queryParams.get('tagName') || null
  const userDisplay = username.replace('guide__', '')
  const user = useStore(state => state.user)
  const setUser = useStore(state => state.setUser)
  const isGuide = username.startsWith('guide__') ? true : false
  const [isPublishing, setIsPublishing] = useState<boolean>(isGuide ? false : true)

  // Chat info
  const currentRoomId = useStore(state => state.currentRoomId)
  const setCurrentRoomId = useStore(state => state.setCurrentRoomId)

  const getRooms = (): Array<Room> => {
    let result: Array<Room> = []
    // Instantiate the JanusClient
    const janusClient = UserService.getJanusClient()
    if (janusClient && janusClient.initJanus) {
      result = janusClient.rooms
    }
    return result
  }

  // This variable contains the information of the chat rooms, which are the combination
  // of the audio and video rooms and their corresponding participants/publishers.
  // It is updated every time the information is requested to the janus client.
  const [rooms, setRooms] = useState<Room[]>(getRooms())
  const defaultRoomId = 1000000

  // Media locations
  const audioRef = useRef(null)
  const localVideoRef1 = useRef(null)
  const localVideoRef2 = useRef(null)
  const localVideoRef3 = useRef(null)

  const activeFeedList = useStore(state => state.activeFeedList)
  const setActiveFeedList = useStore(state => state.setActiveFeedList)

  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void

  const [displayArtworkSelector, setDisplayArtworkSelector] = useState<boolean>(false)

  const destroyJanusSession = janusClient => {
    if (janusClient) {
      janusClient.audioBridgePlugin.hangup()
      janusClient.videoRoomPlugin.hangup()
      if (janusClient.subscriberPluginattached) {
        janusClient.videoRoomSubscriberPlugin.hangup()
      }
      janusClient.textRoomPlugin.hangup()
      janusClient.client.destroy()

      // Unsubscribe from subjects
      janusClient.onTalking.unsubscribe()
      janusClient.onStopTalking.unsubscribe()
      janusClient.onParticipants.unsubscribe()
      janusClient.onPublishers.unsubscribe()
      janusClient.onUnpublish.unsubscribe()
      janusClient.onChange.unsubscribe()
      janusClient.onVideoFeedUpdate.unsubscribe()
      janusClient.onUser.unsubscribe()
    }
  }

  const subscribeToJanusEvents = janusClient => {
    janusClient.onUser.subscribe(setUser)
    janusClient.onTalking.subscribe(onTalkingEvent)
    janusClient.onStopTalking.subscribe(onStopTalkingEvent)
    janusClient.onParticipants.subscribe(async () => {
      await updateChatInfo(janusClient)
    })
    janusClient.onPublishers.subscribe(async () => {
      await updateChatInfo(janusClient)
    })
    janusClient.onUnpublish.subscribe(async publisherId => {
      janusClient.unsubscribeFromPublisher(publisherId)
      setActiveFeedList(janusClient.activeFeedList)
      await updateChatInfo(janusClient)
    })
    janusClient.onChange.subscribe(async () => {
      await updateChatInfo(janusClient)
    })
    janusClient.onVideoFeedUpdate.subscribe(activeFeedList => {
      setActiveFeedList([...activeFeedList])
    })
  }

  const getAllUsersInDb = async () => {
    const users = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user/getAllUsers', {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    })
    return users.json()
  }

  const createJanusSession = async janusClient => {
    // Initial load of the user (only the username, used to join the textRoom)
    janusClient.loadUser(userDisplay)
    janusClient.setAudio(audioRef.current)
    janusClient.setVideo(localVideoRef1.current, localVideoRef2.current, localVideoRef3.current)
    // Check if the janusClient has already all the info
    if (!janusClient.initJanus) {
      // Execute the Janus.init, connect the JanusClient to the Janus server
      try {
        // Initialize janus
        await janusClient.init(false) // Parameter to toogle Janus logs on/off

        // Subscriptions to events coming from the janus client
        subscribeToJanusEvents(janusClient)
        janusClient.setUserIsGuide(isGuide)

        // Create a session and attach plugin handlers.
        await janusClient.connectToJanus()

        // Get rooms and participants from the Janus client and update them
        await updateChatInfo(janusClient)

        // Check if the Hall room exists and if not, create it
        if (
          janusClient.rooms.length === 0 ||
          (janusClient.rooms.length > 0 && janusClient.rooms.filter(r => r.description === 'Hall').length === 0)
        ) {
          await createRoom('Hall', defaultRoomId, janusClient) // Create the default waiting room
          await updateChatInfo(janusClient) // Refresh the chat info
        }
        // Join the default waiting room if there is no current Room
        if (!currentRoomId) {
          await joinRoom(userDisplay, defaultRoomId, janusClient)
          setCurrentRoomId(defaultRoomId)
          await updateChatInfo(janusClient) // Refresh the chat info
        }

        janusClient.loadUser(userDisplay)

        // Send whisper to all users to tell them a new room has been created
        whisperEvent(janusClient, 'joinedChat', [])

        dispatch({ type: ACTION_SET_JANUS_CLIENT, payload: janusClient })
        setIsJanusEnabled(true)
      } catch (error) {
        console.error(error)
      }
    } else {
      dispatch({ type: ACTION_SET_JANUS_CLIENT, payload: janusClient })
      setIsJanusEnabled(true)
    }
  }
  const getUser = async () => {
    let u = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user/' + username, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    })
    let user = await u.json()

    return user
  }

  /**
   * Janus session set up and destroy
   **/
  useEffect(() => {
    console.log('initializing...')
    // Instantiate the JanusClient
    const janusClient = UserService.getJanusClient()
    if (janusClient && janusClient.initJanus) {
      // Entering the component through a navigation from another component
      // Restore some state variables (others are in the zustand shared context)
      dispatch({ type: ACTION_SET_JANUS_CLIENT, payload: janusClient })
      // Refresh chat info (could have changed while in the map component)
      updateChatInfo(janusClient)
      // Get refs from html media tags
      audioRef.current && janusClient.setNewAudio(audioRef.current)
      localVideoRef1.current &&
        localVideoRef2.current &&
        localVideoRef3.current &&
        janusClient.setNewVideo(localVideoRef1.current, localVideoRef2.current, localVideoRef3.current)
      // Re-attach MediaStreams to the media tags (audio and video if there was any active video stream)
      janusClient.reAttachMediaStreams()
    } else {
      // First time entering the component
      createJanusSession(janusClient)
    }
    return () => {
      console.log('Unmounting component')
    }
  }, [])

  const buildMultiTableProps = (pRooms: Array<Room>) => {
    const props: MultiTableProps = { items: [], roomIds: [], rooms: [] }
    // Get all participants and their rooms
    let allParticipants = new Array<any>()
    let roomParticipants = new Array<number>()
    for (let i = 0; i < pRooms.length; i++) {
      allParticipants = allParticipants.concat(pRooms[i].participants)
    }
    for (let i = 0; i < allParticipants.length; i++) {
      if (allParticipants[i]) {
        if (allParticipants[i].audioId) {
          allParticipants[i].id = allParticipants[i].audioId
          allParticipants[i].audioId = allParticipants[i].audioId
        }
        if (allParticipants[i].videoId) {
          allParticipants[i].videoId = allParticipants[i].videoId
        }
      }
    }
    // Add all participants to the props
    props.items = allParticipants
    // Get room info
    for (let i = 0; i < pRooms.length; i++) {
      props.roomIds[i] = pRooms[i].roomId!
      // Retrieve the list of participants that are in the room
      if (pRooms[i].participants) {
        for (let j = 0; j < pRooms[i].participants?.length!; j++) {
          if (pRooms[i].participants![j].audioId) {
            roomParticipants[j] = pRooms[i].participants![j].audioId!
          }
        }
      }
      props.rooms[i] = {
        id: pRooms[i].roomId!,
        title: pRooms[i].description,
        itemIds: roomParticipants
      }
      roomParticipants = new Array<any>()
    }
    return props
  }

  function joinRoom(display: string, roomId: number, janusClient): Promise<any[]> {
    return Promise.all([
      janusClient.joinAudioRoom({ display, muted: true }, roomId),
      janusClient.joinVideoRoom({ display, ptype: 'publisher' }, roomId)
    ])
  }

  const orderSwitchRoom = async (pUser: string, source, destination) => {
    const whoId = pUser
    if (whoId) {
      const whoUsername = getUserByAudioId(Number(whoId)).display
      const sourceId = source.droppableId
      const destinationId = destination.droppableId
      if (whoUsername && sourceId && destinationId) {
        state?.janusClient.sendWhisper(whoUsername, 'switchRooms|' + sourceId + '|' + destinationId)
      }
    }
    await updateChatInfo(state?.janusClient) // Refresh the chat info
  }

  const mute = async () => {
    if (state && state.janusClient) {
      state.janusClient.mute(true)
      // Refresh the state of the chat from Janus
      await updateChatInfo(state.janusClient)
    }
  }

  const unmute = async () => {
    if (state && state.janusClient) {
      state.janusClient.mute(false)
      // Refresh the state of the chat from Janus
      await updateChatInfo(state.janusClient)
    }
  }

  const selectVideo = event => {
    // get the user from the chat info
    const userId = event.target.id.split('-')[1]
    const selectedParticipant = getUserByAudioId(Number(userId))
    const selectedVideoId = Number(selectedParticipant.videoId)
    if (state && state.janusClient) {
      // The user is currently selected
      if (activeFeedList.includes(selectedVideoId)) {
        // Unsuscribe from the user
        state.janusClient.unsubscribeFromPublisher(selectedVideoId)
        setActiveFeedList(state.janusClient.activeFeedList)
        forceUpdate()
      } else {
        // The user is not currently selected
        // Select and subscribe to the user's feed
        // Add the participant to the selected participants list
        const isPublisher = selectedParticipant.publisher
        // check if the user is publishing
        if (isPublisher) {
          // call to subscribeToPublisher and if succesful, update selected users
          state.janusClient.subscribeToPublisher(selectedVideoId, currentRoomId)
        } else {
          console.error('Error: Participant is not a publisher.')
        }
      }
    }
  }

  const createRoom = async (roomName, roomId, janusClient) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (roomName != null && roomName !== '') {
          if (janusClient) {
            await janusClient.createRoom(roomName, roomId)
            resolve()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  const destroyRoom = async (roomId, janusClient) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (roomId != null && roomId !== '') {
          if (janusClient) {
            await janusClient.destroyRoom(roomId)
            resolve()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  const onClickCreateRoom = async () => {
    const roomName = prompt('Please enter the name of the room you want to create', '')
    if (state?.janusClient) {
      let roomId = getNextRoomId()
      // Call the room creation method in Janus
      await createRoom(roomName, roomId, state?.janusClient)
      await updateChatInfo(state?.janusClient)
      // Send whisper to all users to tell them a new room has been created
      whisperEvent(state?.janusClient, 'newRoom', [])
    }
  }

  const onClickDestroyRoom = async event => {
    const roomId = event.target.id.split('-')[1]
    const result = window.confirm('You are about to delete this room, are you sure?')
    if (result) {
      if (state?.janusClient) {
        // Call the room deletion method in Janus
        await destroyRoom(roomId, state?.janusClient)
        updateChatInfo(state?.janusClient)
        // Send whisper to all users to tell them a new room has been destroyed
        whisperEvent(state?.janusClient, 'roomDestroyed', [])
      }
    }
  }

  const onClickSwitchRoom = async event => {
    const roomDescription = event.target.innerHTML
    const destinationId = getRoomByDescription(roomDescription).roomId
    const originId = currentRoomId
    await state?.janusClient.switchRoom(user, originId, destinationId)
    // After changing rooms, update the current room
    setCurrentRoomId(destinationId)

    // Send whisper to all users to tell them the movement of a user
    whisperEvent(state?.janusClient, 'roomChanged', [])

    // Refresh the state of the chat from Janus
    await updateChatInfo(state?.janusClient)
  }

  const onClickUnpublishOwnFeed = () => {
    state?.janusClient.unpublishOwnFeed()
    setIsPublishing(false)
  }

  const onClickPublishOwnFeed = () => {
    state?.janusClient.publishOwnFeed()
    setIsPublishing(true)
  }

  const updateUser = async (userUp: any) => {
    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user/' + username, {
      method: 'PUT', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      body: JSON.stringify(userUp)
    })
    return await r.json()
  }

  const onClickEndSession = () => {
    let usUp = {}
    usUp['chat_id'] = null
    usUp['uwb_id'] = null
    usUp['active'] = false
    updateUser(usUp)
    let janusClient = UserService.getJanusClient()
    destroyJanusSession(janusClient)
    dispatch({ type: REMOVE_JANUS_CLIENT })
    UserService.destroyJanusClient()
    setUser(null)
    setIsJanusEnabled(false)
    setIsPublishing(false)
    setCurrentRoomId(null)
    setActiveFeedList([])
    if (isGuide) {
      navigate('/loginguide')
    } else {
      navigate('/login')
    }
  }

  const onTalkingEvent = (message): boolean => {
    console.log('onTalkingEvent')
    const { id } = message
    const userElement = document.querySelector(`#rp${id}`)

    if (userElement) {
      const isTalking = userElement.classList.contains('bg-primary')

      if (!isTalking) {
        userElement.classList.add('bg-primary', 'text-light')
      }
    }
    return true
  }

  const onStopTalkingEvent = (message): boolean => {
    console.log('onStopTalkingEvent')
    const { id } = message
    const userElement = document.querySelector(`#rp${id}`)

    if (userElement) {
      const isTalking = userElement.classList.contains('bg-primary')

      if (isTalking) {
        userElement.classList.remove('bg-primary', 'text-light')
      }
    }
    return true
  }

  const onWindowKeyUp = useCallback(e => {
    if (e.key === 'v') {
      e.preventDefault()
      mute()
    }
  }, [])

  const onWindowKeyDown = useCallback(e => {
    if (e.key === 'v') {
      if (e.repeat) {
        return
      }
      e.preventDefault()
      unmute()
    }
  }, [])

  const whisperEvent = (pJanusClient, eventName: string, eventArgs: Array<string>) => {
    // Send whisper to all users to inform them of an event (and trigger a chat info refresh)
    let args = ''
    if (eventArgs !== undefined) {
      for (const arg of eventArgs as Array<string>) {
        args += '|' + arg
      }
    }
    for (const room of pJanusClient.rooms as Array<Room>) {
      if (room.participants) {
        for (const participant of room.participants as Array<Participant>) {
          const name = participant.display
          name && name != pJanusClient.user.display && pJanusClient.sendWhisper(name, eventName + '|' + args)
        }
      }
    }
  }

  const updateChatInfo = async janusClient => {
    // Obtain the Janus server state (rooms, participants...)
    if (janusClient) {
      await janusClient.getChatInfo()
      setRooms(janusClient.rooms)
      janusClient.loadUser(userDisplay)
      setUser(janusClient.user)
      forceUpdate()
    }
  }

  /**
   * Getter functions
   **/

  const getUserByAudioId = (audioId: number): Participant => {
    let u: Participant = {}
    if (state && state.janusClient && state.janusClient.rooms) {
      for (let i = 0; i < state?.janusClient.rooms.length; i++) {
        for (let j = 0; j < state?.janusClient.rooms[i].participants!.length; j++) {
          const participant = state?.janusClient.rooms[i].participants![j]
          if (participant.audioId === audioId) {
            u = participant as Participant
            u.room = state?.janusClient.rooms[i].roomId
            break
          }
        }
      }
    }
    return u
  }

  const getRoomByDescription = (description: string): Room => {
    let r: Room = {}
    if (state && state.janusClient && state.janusClient.rooms) {
      for (let i = 0; i < state?.janusClient.rooms.length; i++) {
        const room = state?.janusClient.rooms[i]
        if (room.description === description) {
          r = room
          break
        }
      }
    }
    return r
  }

  const getRoomByParticipantDisplay = (janusClient, participantDisplay: string): Room => {
    // Search the participant in every room and return the room of the match found
    let result = {}
    if (janusClient) {
      for (const room of janusClient.rooms as Array<Room>) {
        for (const participant of room.participants as Array<Participant>) {
          if (participant.display && participant.display === participantDisplay) {
            result = room
            break
          }
        }
      }
    }
    return result
  }

  const getParticipantByDisplay = (roomList: Array<Room>, roomId: number, display: string): Participant => {
    let filteredParticipants
    let result
    // Filter the participants from the room
    if (roomList) {
      const filteredRooms = roomList.filter(r => r.roomId === roomId)
      if (filteredRooms && filteredRooms[0] && filteredRooms[0].participants) {
        filteredParticipants = filteredRooms[0].participants.filter(p => p.display === display)
      }
    }
    // Return the filter results
    if (filteredParticipants && filteredParticipants[0]) {
      result = filteredParticipants[0]
    }
    return result
  }

  const getParticipantByVideoId = (roomList: Array<Room>, roomId: number, publisherId: number): Participant => {
    let filteredParticipants
    let result
    // Filter the participants from the room
    if (roomList) {
      const filteredRooms = roomList.filter(r => r.roomId === roomId)
      if (filteredRooms && filteredRooms[0] && filteredRooms[0].participants) {
        filteredParticipants = filteredRooms[0].participants.filter(p => Number(p.videoId) === publisherId)
      }
    }
    // Return the filter results
    if (filteredParticipants && filteredParticipants[0]) {
      result = filteredParticipants[0]
    }
    return result
  }

  const getParticipantDisplayById = (roomList: Array<Room>, roomId: number, publisherId: number): string => {
    const participant = getParticipantByVideoId(roomList, roomId, publisherId)
    const result = (participant && participant.display) || ''
    return result
  }

  const getNextRoomId = (): number => {
    return state?.janusClient?.rooms.length + 1000000
  }

  const getVideoVisibility = (index: number, pClass: string) => {
    let result = 'hide-video'
    if (activeFeedList && activeFeedList[index] && activeFeedList[index] !== 0) {
      result = pClass
    }
    return result
  }

  const getIsMuted = (): Boolean => {
    let u: Participant
    if (user && user.audioId) {
      u = getUserByAudioId(user.audioId)
    } else {
      return true
    }
    return u.muted !== undefined ? u.muted : true
  }

  const unmountArtwork = () => {
    setDisplayArtworkSelector(false)
  }

  useEffect(() => {
    window.addEventListener('keydown', onWindowKeyDown)
    window.addEventListener('keyup', onWindowKeyUp)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('keyup', onWindowKeyUp)
    }
  }, [onWindowKeyUp, onWindowKeyDown])

  useEffect(() => {
    if (username == 'guide__' || username == 'guide_' || username == 'guide' || username == '') {
      navigate('/loginguide')
    }
    if (user) {
      if (user.audioId) {
        let usUp = {}
        usUp['uwb_id'] = uwbId
        usUp['chat_id'] = JSON.stringify(user.audioId)
        updateUser(usUp)
      }
    }
  }, [user])

  return (
    <Grid>
      <GridItem classItem="Camera" title="Camera">
        <>
          <div id="myvideo" className="camera">
            <div
              id={isGuide ? getVideoVisibility(0, 'video-container') : 'publisher'}
              className={isGuide ? getVideoVisibility(0, 'video-container') : 'publisher'}
            >
              {isGuide && (
                <>
                  <span className={getVideoVisibility(0, 'feed-display')}>
                    {currentRoomId && activeFeedList[0]
                      ? getParticipantDisplayById(state?.janusClient?.rooms, currentRoomId, activeFeedList[0])
                      : ''}
                  </span>
                  <video ref={localVideoRef1} id="video1" autoPlay playsInline muted={true}></video>
                </>
              )}
              {!isGuide && <VideoCanvas tagId={uwbId} />}
            </div>
            {isGuide && (
              <>
                <div className={getVideoVisibility(1, 'video-container')}>
                  <span className={getVideoVisibility(1, 'feed-display')}>
                    {currentRoomId && activeFeedList[1]
                      ? getParticipantDisplayById(state?.janusClient?.rooms, currentRoomId, activeFeedList[1])
                      : ''}
                  </span>
                  <video ref={localVideoRef2} id="localvideo2" autoPlay playsInline muted={true}></video>
                </div>
                <div className={getVideoVisibility(2, 'video-container')}>
                  <span className={getVideoVisibility(2, 'feed-display')}>
                    {currentRoomId && activeFeedList[2]
                      ? getParticipantDisplayById(state?.janusClient?.rooms, currentRoomId, activeFeedList[2])
                      : ''}
                  </span>
                  <video ref={localVideoRef3} id="localvideo3" autoPlay playsInline muted={true}></video>
                </div>
              </>
            )}
          </div>
          <audio ref={audioRef} className="rounded centered" autoPlay />
        </>
      </GridItem>
      <GridItem classItem="Chat" title="Tour rooms">
        <div className="chat">
          {!isJanusEnabled && (
            <>
              <div className="loader-container">
                <Loader type="Grid" color="#049730" height={100} width={100} />
              </div>
            </>
          )}
          {isJanusEnabled && (
            <>
              {isGuide && (
                <button className="btn button-primary create-room" onClick={onClickCreateRoom}>
                  Create Room
                </button>
              )}
              <MultiTableDrag
                data={buildMultiTableProps(rooms)}
                destroyRoom={onClickDestroyRoom}
                mute={mute}
                unmute={unmute}
                onClickSwitchRoom={onClickSwitchRoom}
                orderSwitchRoom={orderSwitchRoom}
                isGuide={isGuide}
                selectVideo={selectVideo}
                user={user}
                currentRoomId={currentRoomId}
                selectedUsers={activeFeedList}
              />
            </>
          )}
        </div>
      </GridItem>
      <GridItem classItem="Chat-Actions" title="">
        <div className="actions">
          <button className="btn button-primary end" onClick={onClickEndSession}>
            End Session
          </button>
          {getIsMuted() ? (
            <button className="btn button-primary unmute" onClick={unmute}>
              Unmute
            </button>
          ) : (
            <button className="btn button-primary mute" onClick={mute}>
              Mute
            </button>
          )}
        </div>
      </GridItem>
      <GridItem classItem="Additional-Actions" title="">
        <div className="actions">
          {isGuide && (
            <button
              className="btn button-primary view-map"
              onClick={() => {
                navigate('/map?name=' + username)
              }}
            >
              View map
            </button>
          )}
          {isGuide && (
            <button
              className="btn button-primary artwork"
              onClick={() => {
                setDisplayArtworkSelector(true)
              }}
            >
              Draw in art
            </button>
          )}
          {displayArtworkSelector && (
            <div className="artwork-container">
              <ArtworkSelector goBack={unmountArtwork} />
            </div>
          )}
          {!isGuide && isPublishing && (
            <button className="btn button-primary unpublish" onClick={onClickUnpublishOwnFeed}>
              Stop Sharing Camera
            </button>
          )}
          {!isGuide && !isPublishing && (
            <button className="btn button-primary publish" onClick={onClickPublishOwnFeed}>
              Share Camera
            </button>
          )}
        </div>
      </GridItem>
    </Grid>
  )
}

export default React.memo(ChatRoom)
