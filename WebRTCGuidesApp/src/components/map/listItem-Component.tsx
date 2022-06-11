import { Divider } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import './listItem.scss'
import configData from '../../../config.json'

const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT
interface Props {
  icon: any
  element: any
  isRoom: boolean
  isEditRoom: boolean
}

const ListItem = (props: Props) => {
  //Props
  const { icon, element, isRoom, isEditRoom } = props
  //Boolean to know if the list is loading
  const [isLoaded, setIsloaded] = useState<boolean>(false)
  //Number of users
  const [numberUSers, setNumberUSers] = useState<number>(0)
  /**
   * Function to get the number of users in the room
   * @returns Number of users in the room
   */
  const getNumberUsersInRoom = async () => {
    if (element.room_id != undefined) {
      let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/room/getAllUsersFromRoom/' + element.alias, {
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
      let number = await r.json()
      return number.numberUsers
    }

  }
  /**
   * Function that delete the room by alias
   */
  const deleteRoom = async () => {
    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/room/' + element.alias, {
      method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
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
    let response = await r.json()
  }
  useEffect(() => {
    const fetchNumberUsersInRoom = async () => {
      let number = await getNumberUsersInRoom()
      setNumberUSers(number)
      setIsloaded(true)
    }
    if (isRoom) {
      //Async function
      fetchNumberUsersInRoom()
    }
  }, [isLoaded, numberUSers])
  return (
    <>
      {isRoom ? (
        <div className="listItem">
          <div className="listItemFlexContainer">
            <div className="listItemContainer">
              <img src={icon} className="anchorIconSidebarInfo"></img>
              <div className="listItemContainerText">
                <h5 className="listItemContainerTextBody">
                  <b> Nombre: {element.alias}</b>
                </h5>
                {isEditRoom ? (
                  <button className="btn button-primary deleteRoom" onClick={() => deleteRoom()}>
                    Eliminar Room
                  </button>
                ) : (
                  <div className="userNumber">Users Number: {numberUSers}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="listItem">
          <div className="listItemFlexContainer">
            <div className="listItemContainer">
              <img src={icon} className="anchorIconSidebarInfo"></img>
              <div className="listItemContainerText">
                <h5 className="listItemContainerTextBody">
                  <b> Alias: {element.alias}</b>
                </h5>
                <h5 className="listItemContainerTextBody">
                  Latitude:{' '}
                  {element.latitude == undefined || element.latitude == null ? '' : element.latitude.toFixed(4)}
                </h5>
                <h5 className="listItemContainerTextBody">
                  Longitude{' '}
                  {element.longitude == undefined || element.longitude == null ? '' : element.longitude.toFixed(4)}
                </h5>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ListItem
