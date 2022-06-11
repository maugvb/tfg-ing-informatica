import React, { useEffect, useRef, useState } from 'react'
import ListItem from './listItem-Component'
import './listSection.scss'
import configData from '../../../config.json'

const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT
const ListSection = props => {
  //Props
  const { icon, headerSection, isRoom, elements, isEditRoom } = props
  //Boolean to know if the list is loading
  const [isLoaded, setIsloaded] = useState<boolean>(false)
  //Rooms array
  const [rooms, setRooms] = useState<[]>([])
  //boolean to know if first render
  const isFirstRender = useRef(true)
  /**
   * Function to get the rooms
   * @returns array 
   */
  const getRooms = async () => {
    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/room/getAllRooms', {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
      //body: JSON.stringify(anchorAdd)// body data type must match "Content-Type" header
    })
    let rooms = await r.json()
    return rooms
  }

  useEffect(() => {
    const getRoomsAsync = async () => {
      let roomsFetch = await getRooms()
      setRooms(roomsFetch)
      setIsloaded(true)
    }
    if (isFirstRender.current) {
      isFirstRender.current = false // toggle flag after first render/mounting
      getRoomsAsync()
      return
    }
    
  }, [rooms, isLoaded])
  return (
    <div>
      <div className="headerSection">
        <h4 className="headerSectionText"> {headerSection}</h4>
      </div>
      <hr className="divisorHeaderSection" />
      <div className="listItems">
        <hr className="divisorHeaderSection" />

        {isRoom ? (
          isLoaded ? (
            rooms.length > 0 ? (
              rooms.map((element, index) => (
                <ListItem
                  icon={props.icon}
                  isEditRoom={isEditRoom}
                  isRoom={isRoom}
                  key={index}
                  element={element}
                ></ListItem>
              ))
            ) : (
              <div className="listItem listItemNoElement">
                <div className="listItemNoElementFlex">
                  <h5 className="listItemNoElementContent">No elements</h5>
                </div>
              </div>
            )
          ) : (
            <></>
          )
        ) : props.elements.length > 0 ? (
          props.elements.map((element, index) => (
            <ListItem
              icon={props.icon}
              isEditRoom={isEditRoom}
              isRoom={isRoom}
              key={index}
              element={element}
            ></ListItem>
          ))
        ) : (
          <div className="listItem listItemNoElement">
            <div className="listItemNoElementFlex">
              <h5 className="listItemNoElementContent">No elements</h5>
            </div>
          </div>
        )}
        <hr className="divisorHeaderSection" />
      </div>
    </div>
  )
}

export default ListSection
