import React, { useEffect, useRef, useState } from 'react'
import { Map, View, Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { OSM, Vector as VectorSource } from 'ol/source'
import { Tile as TileLayer, Vector } from 'ol/layer'
import { Point, Polygon } from 'ol/geom'
import image from './images/test.png'
import sensorIcon from './images/sensor.png'
import { Snap, Translate, Select, Draw } from 'ol/interaction'

import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Stroke, Fill, Text, Icon, RegularShape } from 'ol/style'
import close_icon from './images/icons/close_icon.png'
import { json_lines_2 } from './data/vicomtech'

import Sidebar from '../sidebarMenu/sidebarComponent'

import './map.scss'
import { useStore } from '../../context/context'
import { useNavigate } from 'react-router-dom'
import UserService from '../../utils/user-service'

import configData from '../../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT

const MapComponent: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search)
  const param = queryParams.get('name') || 'GUEST'
  const [username] = useState(param)
  const navigate = useNavigate()


  const [map, setMap] = useState<any>(undefined)
  /**
   * ANCHORS DEFS
   */
  //Array of Tag Objects with fields from db
  const [anchorsArray, setAnchorsArray] = useState<any>([])
  const [moveAnchorEnable, setMoveAnchorEnable] = useState(false)
  const [arrayAnchorsFeature, setarrayAnchorsFeature] = useState<any>([])
  const [arrayAnchors, setarrayAnchors] = useState<any>([])
  const [anchorSelected, setAnchorSelected] = useState<any>(undefined)
  const [previousAnchorSelected, setPreviousAnchorSelected] = useState<any>(undefined)
  //Array of Rooms Objects with fields from db
  /**
   * ROOMS DEFS
   */
  const [roomsArray, setRoomsArray] = useState<any>([])
    /**
   * TAGS DEFS
   */
  //Array of Tag Objects Feature from OL
  const [arrayTalesTags, setArrayTalesTags] = useState<any>([])
  const arrayTags = useStore(state => state.arrayTags)
  const setArrayTags = useStore(state => state.setArrayTags)
  //Boolean to show or hide the a sidebar
  const [openedSideBar, setOpenedSideBar] = useState(false)
  const [markerSideBar, setMarkerSideBar] = useState(undefined)

  const isFirstRender = useRef(true)

  // Get Janus session
  const janusClient = UserService.getJanusClient()

  //Function to create a new Feature Tag and add it as a layer to the map
  const addTag = async () => {
    if (map != null) {
      var tags = await getTags()

      let anchorsFix = await getAnchors()
      //Delete Tags
      let layers = map.getLayers().getArray()
      const deleteTags = layers.filter(
        ({ className_: alias1 }) =>
          !tags.some(({ alias: alias2 }) => alias2 === alias1) &&
          !anchorsFix.some(({ alias: alias3 }) => alias3 === alias1) &&
          alias1 != 'room' &&
          alias1 != 'ol-layer'
      )
      for (let i = 0; i < deleteTags.length; i++) {
        map.removeLayer(deleteTags[i])
        setArrayTalesTags(arrayTalesTags.filter(tag => tag.values_.name !== deleteTags[i].className_))
      }

      //Add Tags
      const addTags = tags.filter(({ alias: alias1 }) => !layers.some(({ className_: alias2 }) => alias2 === alias1))
      for (let i = 0; i < addTags.length; i++) {
        var geoJson = JSON.parse(addTags[i].coordinates)
        var taleAux = new Feature({
          name: addTags[i].alias,
          geometry: new Point(fromLonLat(geoJson.geometry.coordinates))
        })
        taleAux.setStyle(
          new Style({
            image: new Icon({
              anchor: [0.5, 1],
              scale: 0.09,
              src: image
            })
          })
        )

        var vectorSourceTags = new VectorSource({
          features: [taleAux]
        })

        var vectorLayerTags = new Vector({
          className: addTags[i].alias,
          source: vectorSourceTags
        })
        setArrayTalesTags([...arrayTalesTags, taleAux])

        map.addLayer(vectorLayerTags)
      }

      //update tags
      const updateTagsLayers = layers.filter(({ className_: alias1 }) =>
        tags.some(({ alias: alias2 }) => alias2 === alias1)
      )
      const updateTagsObject = tags.filter(({ alias: alias1 }) =>
        layers.some(({ className_: alias2 }) => alias2 === alias1)
      )
      for (let i = 0; i < updateTagsObject.length; i++) {
        var geoJson = JSON.parse(updateTagsObject[i].coordinates)
        updateTagsLayers[i]
          .getSource()
          .getFeatures()[0]
          .setGeometry(new Point(fromLonLat(geoJson.geometry.coordinates)))
      }

      map.getLayers().forEach((layer: any) => {
        if (layer.className_ === 'room') {
          return
        }
      })

      setArrayTags(tags)
    }
  }

  const onClickMap = evt => {
    var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature
    })
    //alert(toLonLat(evt.coordinate))
    var selectedFeature = false
    var isAnchor = false
    for (var i = 0; i < arrayTalesTags.length; i++) {
      if (feature === arrayTalesTags[i]) {
        //Not Working Properly
        openedSideBar ? updateSidebar(arrayTalesTags[i]) : openSideBar(arrayTalesTags[i])
        selectedFeature = true
        document.getElementById('WrapperButtons')?.classList.remove('WrapperButtonsVisible')
        document.getElementById('WrapperButtons')?.classList.add('WrapperButtonsHidden')
      }
    }

    for (var i = 0; i < arrayAnchorsFeature.length; i++) {
      if (feature === arrayAnchorsFeature[i].getSource().getFeatures()[0]) {
        isAnchor = true
        //Not Working Properly
        openedSideBar
          ? updateSidebar(arrayAnchorsFeature[i].getSource().getFeatures()[0])
          : openSideBar(arrayAnchorsFeature[i].getSource().getFeatures()[0])
        if (!openedSideBar) {
          setMoveAnchorEnable(false)
        }
        setAnchorSelected(arrayAnchorsFeature[i].getSource().getFeatures()[0])
        selectedFeature = true
        document.getElementById('WrapperButtons')?.classList.remove('WrapperButtonsHidden')
        document.getElementById('WrapperButtons')?.classList.add('WrapperButtonsVisible')
      }
    }

    if (selectedFeature === false) {
      closeSideBar()
      setMoveAnchorEnable(false)
      setAnchorSelected(undefined)
    }
  }

  //Function to init the map render
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

    mapAux.getView().setRotation(0.389066)

    // UI Interactions


    document.getElementById('close-sidebar1')!.addEventListener('click', () => {
      document.getElementById('sidebar1')!.classList.remove('opened-sidebar')
      document.getElementById('sidebar1')!.classList.add('closed-sidebar')
      document.getElementById('map')!.classList.remove('opened-sidebar-map')
      document.getElementById('map')!.classList.add('closed-sidebar-map')
      if (openedSideBar === true) {
        //Also called functions to perform actions in onCLick event in tag of Component Img
        setOpenedSideBar(false)
      }
      setMarkerSideBar(undefined)
    })
    //mapAux.addEventListener('click', onClickMap)
    setMap(mapAux)
  }

  const closeSideBar = () => {
    document.getElementById('sidebar1')!.classList.remove('opened-sidebar')
    document.getElementById('sidebar1')!.classList.add('closed-sidebar')
    document.getElementById('map')!.classList.remove('opened-sidebar-map')
    document.getElementById('map')!.classList.add('closed-sidebar-map')
    if (openedSideBar === true) {
      setOpenedSideBar(false)
    }
    setMarkerSideBar(undefined)
  }
  //Function for Open the sidebar
  const openSideBar = marker => {
    setMarkerSideBar(marker)
    var coords = toLonLat(marker.getGeometry().getCoordinates())

    document.getElementById('header-sidebar')!.innerHTML = 'Datos de User: ' + marker.get('name') + '<br>'
    document.getElementById('sidebar1')!.classList.remove('closed-sidebar')
    document.getElementById('sidebar1')!.classList.add('opened-sidebar')
    document.getElementById('map')!.classList.remove('closed-sidebar-map')
    document.getElementById('map')!.classList.add('opened-sidebar-map')
    document.getElementById('lat')!.innerHTML = 'Latitude: ' + String(coords[1])
    document.getElementById('lon')!.innerHTML = 'Longitude: ' + String(coords[0])
    if (openedSideBar === false) {
      setOpenedSideBar(true)
    }
  }

  //Function to init Tags and render them int he map
  const initTags = async () => {
    //await addTag()
    var tags = await getTags()
    setArrayTags(tags)
    let tagsObject: any = []

    for (let i = 0; i < tags.length; i++) {
      var geoJson = JSON.parse(tags[i].coordinates)
      var taleAux = new Feature({
        name: tags[i].alias,
        geometry: new Point(fromLonLat(geoJson.geometry.coordinates))
      })
      taleAux.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 1],
            scale: 0.09,
            src: image
          })
        })
      )

      tagsObject.push(taleAux)

      var vectorSourceTags = new VectorSource({
        features: [taleAux]
      })

      var vectorLayerTags = new Vector({
        className: tags[i].alias,
        source: vectorSourceTags
      })

      map.addLayer(vectorLayerTags)
    }

    setArrayTalesTags([...arrayTalesTags, ...tagsObject])
  }
  //Function get all anchors
  const getAnchors = async () => {
    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/anchor/getAllAnchors', {
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
    let anchors = await r.json()
    for (var i = 0; i < anchors.length; i++) {
      anchors[i]['feature'] = undefined
    }
    return anchors
  }
  //Function to init all anchors
  const initAnchors = async () => {
    //fetches the data from the server

    var anchors = await getAnchors()

    var feature
    let anchorsAux: any = []
    let anchorObjects: any = []

    var s1 = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: sensorIcon
      })
    })
    var s2 = new Style({
      image: new RegularShape({
        stroke: new Stroke({ color: [0, 0, 0, 0] }),
        fill: new Fill({ color: [0, 0, 0, 0] }),
        points: 4,
        radius: 15, // <--------- control its size
        angle: Math.PI / 4
      })
    })
    for (let i = 0; i < anchors.length; i++) {
      feature = new Feature({
        name: anchors[i].alias,
        geometry: new Point(fromLonLat([anchors[i].latitude, anchors[i].longitude]))
      })
      feature.setStyle([s1, s2])

      var auxTag = anchors[i]

      auxTag.isMoved = false

      anchorObjects.push(auxTag)

      anchorsAux.push(feature)
      anchors[i]['feature'] = feature
    }

    setAnchorsArray(anchorObjects)

    let auxVectorAnchors = new Array()
    for (let i = 0; i < anchorsAux.length; i++) {
      var vectorSourceAnchors = new VectorSource({
        features: [anchorsAux[i]]
      })

      var vectorLayerAnchors = new Vector({
        className: anchors[i].alias,
        source: vectorSourceAnchors
      })

      auxVectorAnchors = [...auxVectorAnchors, vectorLayerAnchors]

      map.addLayer(vectorLayerAnchors)
    }
    setarrayAnchors(anchors)
    setarrayAnchorsFeature(auxVectorAnchors)
  }

  //Funtion to get Tags from DB
  const getTags = async () => {
    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/tag/getTagsWithUsers', {
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
    let tags = await r.json()
    return tags
  }

  //Function for update data from the sidebar
  const updateSidebar = marker => {
    setMarkerSideBar(marker)
    var coords = toLonLat(marker.getGeometry().getCoordinates())
    document.getElementById('header-sidebar')!.innerHTML = 'Datos de Usuario: ' + marker.get('name') + '<br>'
    document.getElementById('name')!.innerHTML = 'Nombre del tag: ' + marker.get('name') + '<br>'
    document.getElementById('lat')!.innerHTML = 'Latitude: ' + String(coords[1])
    document.getElementById('lon')!.innerHTML = 'Longitude: ' + String(coords[0])
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
      var coordinatesPolygon = new Array()

      // El bucle atraviesa la latitud y la longitud hasta el sistema de coordenadas de proyección "EPSG: 4326"
      for (var j = 0; j < roomsCoord.length; j++) {
        var pointTransform = fromLonLat(roomsCoord[j])
        coordinatesPolygon.push(pointTransform)
      }
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

    setRoomsArray(rooms)
  }
  //Function to update anchors in the map
  const updateAnchor = async () => {
    var anchorAux
    var s1 = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: sensorIcon
      })
    })
    var s2 = new Style({
      image: new RegularShape({
        stroke: new Stroke({ color: [0, 0, 0, 0] }),
        fill: new Fill({ color: [0, 0, 0, 0] }),
        points: 4,
        radius: 15, // <--------- control its size
        angle: Math.PI / 4
      })
    })
    var borderStroke = new Style({
      image: new RegularShape({
        stroke: new Stroke({ color: 'white', width: 2 }),
        points: 4,
        radius: 25, // <--------- control its size
        angle: Math.PI / 4
      })
    })
    anchorsArray.map(anchor => {
      if (anchor.feature === anchorSelected) {
        anchor.isMoved = false
        anchor.feature.setStyle([s1, s2, borderStroke])
      }
    })

    for (var i = 0; i < arrayAnchors.length; i++) {
      if (anchorSelected === arrayAnchors[i].feature) {
        arrayAnchors[i].latitude = toLonLat(arrayAnchors[i].feature.getGeometry().getCoordinates())[0]
        arrayAnchors[i].longitude = toLonLat(arrayAnchors[i].feature.getGeometry().getCoordinates())[1]
        anchorAux = arrayAnchors[i]
      }
    }

    if (anchorAux !== undefined) {
      var anchorUpdate = {
        anchor_id: anchorAux.anchor_id,
        latitude: anchorAux.latitude,
        longitude: anchorAux.longitude,
        alias: anchorAux.alias,
        user: anchorAux.user
      }

      let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/anchor/' + anchorUpdate.anchor_id, {
        method: 'PUT', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        },
        body: JSON.stringify(anchorUpdate) // body data type must match "Content-Type" header
      })

      let anchor = await r.json()
    }
  }
  //Functions to move anchor
  const moveAnchor = () => {

    setMoveAnchorEnable(!moveAnchorEnable)
  }

  //Hook to render the map
  useEffect(() => {
    if (!map) {
      initMap()
    }
  }, [])
  /*HOOKS*/ 
  //Hook to render in first render Tags and Anchors
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false // toggle flag after first render/mounting
      return
    }

    initRooms().then(() => {
      initTags()
      initAnchors()
    })
  }, [map])

  //Hook to manage click event on the map
  useEffect(() => {
    if (map != undefined) {
      map.addEventListener('click', onClickMap)
      return () => {
        map.removeEventListener('click', onClickMap)
      }
    }
  }, [arrayTags, arrayAnchorsFeature])

  useEffect(() => {
    if (map != undefined) {
      const translate = new Translate({
        filter: function (feature) {
          for (let i = 0; i < arrayAnchors.length; i++) {
            if (arrayAnchors[i].feature === feature && feature === anchorSelected) {
              arrayAnchors[i].isMoved = true
            }
          }
          for (let i = 0; i < arrayAnchorsFeature.length; i++) {
            if (feature === anchorSelected) {
              return true
            }
          }
          return false
        }
      })
      if (moveAnchorEnable) {
        map.addInteraction(translate)
      } else {
        map.getInteractions().pop()
      }
    }
  }, [moveAnchorEnable, arrayAnchorsFeature])
  //Hook to update data tags every 1 secs from db
  useEffect(() => {
    const interval = setInterval(addTag, 1000)
    return () => clearInterval(interval)
  }, [arrayTags])

  //Border in anchor click
  useEffect(() => {
    if (map != undefined) {
      var s1 = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          src: sensorIcon
        })
      })
      var s2 = new Style({
        image: new RegularShape({
          stroke: new Stroke({ color: [0, 0, 0, 0] }),
          fill: new Fill({ color: [0, 0, 0, 0] }),
          points: 4,
          radius: 15, // <--------- control its size
          angle: Math.PI / 4
        })
      })
      var borderStroke = new Style({
        image: new RegularShape({
          stroke: new Stroke({ color: 'white', width: 2 }),
          points: 4,
          radius: 25, // <--------- control its size
          angle: Math.PI / 4
        })
      })
      var borderStrokeRed = new Style({
        image: new RegularShape({
          stroke: new Stroke({ color: 'red', width: 2 }),
          points: 4,
          radius: 25, // <--------- control its size
          angle: Math.PI / 4
        })
      })
      if (anchorSelected == undefined && previousAnchorSelected != undefined) {
        var isRed = false
        for (var i = 0; i < anchorsArray.length; i++) {
          if (anchorsArray[i].feature === previousAnchorSelected && anchorsArray[i].isMoved === true) {
            previousAnchorSelected.setStyle([s1, s2, borderStrokeRed])
            isRed = true
          }
        }
        if (!isRed) {
          previousAnchorSelected.setStyle([s1, s2])
        }
        setPreviousAnchorSelected(undefined)
      }
      if (anchorSelected != undefined && anchorSelected !== previousAnchorSelected) {
        if (openedSideBar) {
          if (previousAnchorSelected != undefined) {
            var isRed = false
            for (var i = 0; i < anchorsArray.length; i++) {
              if (anchorsArray[i].feature === previousAnchorSelected && anchorsArray[i].isMoved === true) {
                previousAnchorSelected.setStyle([s1, s2, borderStrokeRed])
                isRed = true
              }
            }
            if (!isRed) {
              previousAnchorSelected.setStyle([s1, s2])
            }
          }
          anchorSelected.setStyle([s1, s2, borderStroke])
          setPreviousAnchorSelected(anchorSelected)
        } else {
          var isRed = false
          for (var i = 0; i < anchorsArray.length; i++) {
            if (anchorsArray[i].feature === anchorSelected && anchorsArray[i].isMoved === true) {
              anchorSelected.setStyle([s1, s2, borderStrokeRed])
              isRed = true
            }
          }
          if (!isRed) {
            anchorSelected.setStyle([s1, s2])
          }
        }
      }
    }
  }, [openedSideBar, anchorSelected, previousAnchorSelected, anchorsArray])

  return (
    <>
      <div id="map" className="closed-sidebar-map"></div>
      <script type="module" src="./main.js"></script>
      <button
        className="btn button-primary back-button-map"
        onClick={() => {
          navigate('/chat?name=' + username)
        }}
      >
        ⬅️ Chat
      </button>
      <button
        id="fetchTrigger"
        className="btn button-primary edit-button-map"
        onClick={() => {
          navigate('/editRooms?name=' + username)
        }}
      >
        Editar Rooms
      </button>
      <Sidebar
        anchors={anchorsArray}
        tags={arrayTags}
        username={username}
        isEditRoom={false}
        navigate={useNavigate()}
      ></Sidebar>
      <div id="sidebar1" className="sidebar closed-sidebar">
        <img
          id="close-sidebar1"
          src={close_icon}
          onClick={() => {
            closeSideBar()
            setMoveAnchorEnable(false)
            setAnchorSelected(undefined)
          }}
          alt="sidebar"
        />

        <div className="header-container">
          <h1 id="header-sidebar" className="item"></h1>
          <div id="WrapperButtons" className="WrapperButtons WrapperButtonsVisible">
            <div className="buttonsContainer">
              <button
                id="fetchTrigger"
                className="btn button-primary "
                onClick={() => {
                  moveAnchor()
                }}
              >
                {moveAnchorEnable ? 'Desactivar Movimiento' : 'Activar Movimiento'}
              </button>
              <button
                id="fetchTrigger"
                className="btn button-primary"
                onClick={() => {
                  updateAnchor()
                }}
              >
                Guardar Anchor
              </button>
            </div>
          </div>
        </div>
        <div id="body-sidebar">
          <p id="name" className="item"></p>
          <p id="lat" className="item"></p>
          <p id="lon" className="item"></p>
        </div>
      </div>
    </>
  )
}

export default MapComponent
