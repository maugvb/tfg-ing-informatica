import React, { useEffect, useRef, useState } from 'react'
import { Map, View, Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { OSM, Vector as VectorSource } from 'ol/source'
import VectorLayer from 'ol/layer/Vector'
import { Tile as TileLayer, Vector } from 'ol/layer'
import { Polygon } from 'ol/geom'
import { Snap, Draw } from 'ol/interaction'

import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Stroke, Fill, Text } from 'ol/style'
import { json_lines_2 } from './data/vicomtech'
import './editRooms.scss'

import { useNavigate } from 'react-router-dom'
import Sidebar from '../sidebarMenu/sidebarComponent'

import configData from '../../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT

const EditRooms: React.FC = () => {

  const queryParams = new URLSearchParams(window.location.search)
  const param = queryParams.get('name') || 'GUEST'
  const [username] = useState(param)
  const navigate = useNavigate()

  //Map state
  const [map, setMap] = useState<any>(undefined)
  //Draw poligon of a room
  const [draw, changeDraw] = useState<any>(undefined)
  const [snap, changeSnap] = useState<any>(undefined)
  //As a Vector Layer
  const [roomsToSave, changeRoomsToSave] = useState<any>([])
  //As Objects
  const [roomsToAdd, changeRoomsToAdd] = useState<any>([])
  //Boolean to know if the list is loading
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  //Boolean to know if is first render
  const isFirstRender = useRef(true)
  /**
   * Function to init the map
   */
  const initMap = () => {
    var createTextStyle = function (
      feature,
      resolution,
      labelText,
      labelFont,
      labelFill,
      placement,
      bufferColor,
      bufferWidth
    ) {
      if (feature.hide || !labelText) {
        return
      }

      var bufferStyle: any = undefined

      if (bufferWidth === 0) {
        bufferStyle = undefined
      } else {
        bufferStyle = new Stroke({
          color: bufferColor,
          width: bufferWidth
        })
      }

      var textStyle = new Text({
        font: labelFont,
        text: labelText,
        textBaseline: 'middle',
        textAlign: 'left',
        offsetX: 8,
        offsetY: 3,
        placement: placement,
        maxAngle: 0,
        fill: new Fill({
          color: labelFill
        }),
        stroke: bufferStyle
      })

      return textStyle
    }

    var style_lines_2 = function (feature, resolution) {
      var labelText = ''
      var labelFont = '10px, sans-serif'
      var labelFill = '#000000'
      var bufferColor = ''
      var bufferWidth = 0
      var placement = 'line'
      if ('' !== null) {
        labelText = String('')
      }
      var style = [
        new Style({
          stroke: new Stroke({
            color: 'rgba(35,35,35,1.0)',
            lineDash: undefined,
            lineCap: 'square',
            lineJoin: 'miter',
            width: 0
          }),
          text: createTextStyle(
            feature,
            resolution,
            labelText,
            labelFont,
            labelFill,
            placement,
            bufferColor,
            bufferWidth
          )
        })
      ]

      return style
    }

    var format_lines_2 = new GeoJSON()
    var features_lines_2 = format_lines_2.readFeatures(json_lines_2, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
    var jsonSource_lines_2 = new VectorSource({
      attributions: ''
    })
    jsonSource_lines_2.addFeatures(features_lines_2)
    var lyr_lines_2 = new Vector({
      declutter: true,
      source: jsonSource_lines_2,
      style: style_lines_2
    })
    //New map
    const mapAux = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        lyr_lines_2
      ],
      view: new View({
        center: fromLonLat([-1.98637, 43.29287]),
        zoom: 22
      })
    })
    //Change rotation
    mapAux.getView().setRotation(0.389066)
    setMap(mapAux)
  }
  /**
   * Function to save the rooms
   */
  const saveRooms = () => {
    getId().then(id => {
      

    for (let i = 0; i < roomsToAdd.length; i++) {
      var result = prompt("Nombre de la habitación");
      if (result == null) {
        roomsToAdd[i].alias = 'room'+(id+i+1)}else{
        roomsToAdd[i].alias = result
      
      }

      fetch(SERVER_URL + ':' + SERVER_PORT + '/room', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        },
        body: JSON.stringify(roomsToAdd[i]) // body data type must match "Content-Type" header
      })
    }})

    changeRoomsToAdd([])
    changeRoomsToSave([])
  }

  /**
   * Functions for get the rooms from the database
   * Set it in the map
   */

  const getId = async () => {
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
    })
    let rooms = await r.json()
    return rooms.length
  }
  /**
   * Functions for get the rooms from the database
   * Set it in the map
   */
  const initRooms = async () => {
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
    for (let i = 0; i < rooms.length; i++) {
      let roomsCoord = await JSON.parse(rooms[i].coordinates)
      console.log(rooms)
      var coordinatesPolygon = new Array()

      // El bucle atraviesa la latitud y la longitud hasta el sistema de coordenadas de proyección "EPSG: 4326"
      // The loop traverses the latitude and longitude until the "EPSG: 4326" system of coordinates
      for (var j = 0; j < roomsCoord.length; j++) {
        var pointTransform = fromLonLat(roomsCoord[j])
        coordinatesPolygon.push(pointTransform)
      }
      console.log(coordinatesPolygon)
      var pol = new Polygon([coordinatesPolygon])

      var feature = new Feature({
        geometry: pol
      })

      var vectorSource = new VectorSource({ features: [feature] })

      var vectorLayerRooms = new Vector({
        className: 'room',
        source: vectorSource,
        style: new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 3
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)'
          })
        })
      })

      map.addLayer(vectorLayerRooms)
    }
  }
  /**
   * Function tht activates drawing polygon
   */
  const drawPolygon = () => {
    setIsDrawing(!isDrawing)
    console.log('DRAWING FEATURE')
    console.log(isDrawing)
  }
  /* HOOKS */
  useEffect(() => {
    initMap()
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false // toggle flag after first render/mounting
      return
    }

    initRooms()
  }, [map])

  useEffect(() => {
    if (isDrawing) {
      //Creates a layer
      var vectorSource = new VectorSource()

      var vectorLayerRooms = new Vector({
        className: 'room',
        source: vectorSource,
        style: new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 3
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)'
          })
        })
      })

      map.addLayer(vectorLayerRooms)
      changeRoomsToSave([...roomsToSave, vectorLayerRooms])

      let drawAux = new Draw({
        source: vectorSource,
        type: 'Polygon'
      })
      changeDraw(drawAux)
      map.addInteraction(drawAux)
      let snapAux = new Snap({ source: vectorSource })
      map.addInteraction(snapAux)
      changeSnap(snapAux)
    } else {
      //console log all layer from map variable in open layers

      if (map) {
        console.log(map.getLayers().getArray().length)
      }
      var auxRoomsToAdd: any = []
      //Creates a references of the rooms to save
      if (roomsToSave.length > 0) {
        for (let i = 0; i < roomsToSave.length; i++) {
          console.log(roomsToSave[i].getSource().getFeatures().length)
          if (roomsToSave[i].getSource().getFeatures().length === 0) {
            map.removeLayer(roomsToSave[i])
            roomsToSave.splice(i, 1)
          } else {
            let numberFeatures = roomsToSave[i].getSource().getFeatures().length
            for (let j = 0; j < numberFeatures; j++) {
              console.log(roomsToSave[i].getSource().getFeatures()[j].getGeometry().getCoordinates()[0])
              var coordinatesPolygon = new Array()
              for (var k = 0; k < roomsToSave[i].getSource().getFeatures()[j].getGeometry().getCoordinates()[0].length; k++) {
                var pointTransform = toLonLat(
                  roomsToSave[i].getSource().getFeatures()[j].getGeometry().getCoordinates()[0][k]
                )
                coordinatesPolygon.push(pointTransform)
              }
              auxRoomsToAdd.push({
                alias: '',
                coordinates: JSON.stringify(coordinatesPolygon)
              })
            }
          }
          changeRoomsToAdd(auxRoomsToAdd)

        }
      }
      if (snap != undefined) {
        map.removeInteraction(snap)
      }

      if (draw != undefined) {
        map.removeInteraction(draw)
      }
    }
  }, [isDrawing])

  useEffect(() => {
    if (roomsToAdd.length > 0 && roomsToSave.length > 0) {
      saveRooms()
    }
  }, [roomsToAdd])

  return (
    <>
      <div id="map" className="closed-sidebar-map"></div>
      <script type="module" src="./main.js"></script>
      <Sidebar anchors={[]} tags={[]} username={username} isEditRoom={true} navigate={useNavigate()}></Sidebar>

      <button
        className="btn button-primary back-button-map"
        onClick={() => {
          navigate('/map?name=' + username)
        }}
      >
        ⬅️ Go back to Map
      </button>
      <button
        id="fetchTrigger"
        className="btn button-primary edit-rooms edit-button-map"
        onClick={() => {
          drawPolygon()
        }}
      >
        {isDrawing ? 'Parar de Dibujar' : 'Dibujar'}
      </button>
    </>
  )
}

export default EditRooms
