import React, { useEffect } from 'react'
// p5
import Sketch from 'react-p5'
import p5Types from 'p5' //Import this for typechecking and intellisense
// tfjs
import * as tf from '@tensorflow/tfjs'
import { loadGraphModel } from '@tensorflow/tfjs-converter'
import modelURL from '../../../assets/model/model.json?url'

import configData from '../../../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT
interface ComponentProps {
  tagId: string | null
}

interface Detection {
  class: number
  label: string
  score: number
  x: number
  y: number
  width: number
  height: number
}

tf.setBackend('webgl')

let myP5,
  canvasWidth,
  canvasHeight,
  video,
  modelPromise,
  canvas,
  extraCanvas,
  artworkName,
  remoteDrawingInterval,
  requestRoomInterval,
  triggerEventName
let detector: any
let detections: any[] = []
let visitedRooms: string[] = []
let triggerEvent,
  fadeOutFlag,
  fadeOut,
  remoteDrawingArtworkDetected = false
let detectionsLoop = true
let contentAlpha = 255
// Remote drawing
var drawing: any[] = []

const threshold = 0.75
const classesDir = {
  1: {
    name: 'monalisa',
    id: 1
  },
  2: {
    name: 'the_scream',
    id: 2
  },
  3: {
    name: 'starry_night',
    id: 3
  }
}

const VideoCanvas: React.FC<ComponentProps> = (props: ComponentProps) => {
  const { tagId } = props

  // See annotations in JS for more information
  const setup = (p5: p5Types, canvasParentRef: Element) => {
    // Reference the p5 variable to a variable with global scope to be accessed
    // outside the p5 methods.
    myP5 = p5

    // Calculate canvas size
    canvasWidth = canvasParentRef.clientWidth
    canvasHeight = canvasParentRef.clientHeight
    // Create video canvas and put it in the correct container
    canvas = p5.createCanvas(canvasWidth, canvasHeight)
    canvas.parent(canvasParentRef)
    // Create drawing canvas and set it to be transparent
    extraCanvas = p5.createGraphics(canvasWidth, canvasHeight).clear()

    // Start the remote drawing request loop
    initRemoteDrawing()
    // Start room request loop
    initRequestRoom()

    // Get camera stream and load object detector and start detection loop
    video = p5.createCapture(
      {
        audio: false,
        video: {
          facingMode: 'environment'
        }
      },
      () => {
        video.hide()
        // Load model
        modelPromise = load_model()
        // Start detection loop when model is loaded
        Promise.all([modelPromise])
          .then(values => {
            detector = values[0]
            detectFrame()
          })
          .catch(error => {
            console.error(error)
          })
      }
    )
  }

  async function load_model() {
    const model = await loadGraphModel(modelURL)
    return model
  }

  const process_input = video_frame => {
    const tfimg = tf.browser.fromPixels(video_frame).toInt()
    const expandedimg = tfimg.transpose([0, 1, 2]).expandDims()
    return expandedimg
  }

  const detectFrame = () => {
    if (detectionsLoop) {
      tf.engine().startScope()
      detector.executeAsync(process_input(video.elt)).then(predictions => {
        savePredictions(predictions)
        requestAnimationFrame(() => {
          detectFrame()
        })
        tf.engine().endScope()
      })
    }
  }

  const buildDetectedObjects = (scores, threshold, boxes, classes, classesDir) => {
    const detectionObjects: any[] = []
    scores[0].forEach((score, i) => {
      if (score > threshold) {
        const bbox: number[] = []
        const minY = boxes[0][i][0] * canvasHeight
        const minX = boxes[0][i][1] * canvasWidth
        const maxY = boxes[0][i][2] * canvasHeight
        const maxX = boxes[0][i][3] * canvasWidth
        bbox[0] = minX
        bbox[1] = minY
        bbox[2] = maxX - minX
        bbox[3] = maxY - minY
        detectionObjects.push({
          class: classes[i],
          label: classesDir[classes[i]].name,
          score: score.toFixed(4),
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        })
      }
    })
    // console.log('detectionObjects', detectionObjects)
    return detectionObjects
  }

  const savePredictions = predictions => {
    // PRINT PREDICTION TENSORS
    // for (let i = 0; i < predictions.length; i++) {
    //   console.log('i:', i)
    //   predictions[i].print()
    // }

    //Getting predictions
    const boxes = predictions[6].arraySync()
    const scores = predictions[7].arraySync()
    const classes = predictions[5].dataSync()
    detections = buildDetectedObjects(scores, threshold, boxes, classes, classesDir)
  }

  const windowResized = (p5: p5Types) => {
    // Get new size
    let parentContainer = document.querySelector('.react-p5') as HTMLElement
    canvasWidth = parentContainer.offsetWidth
    canvasHeight = parentContainer.offsetHeight
    // Resize canvas
    p5.resizeCanvas(canvasWidth, canvasHeight)
    p5.image(video, 0, 0, canvasWidth, canvasHeight)
    // Resize graphics
    let newExtraCanvas = p5.createGraphics(canvasWidth, canvasHeight)
    newExtraCanvas.image(extraCanvas, 0, 0, newExtraCanvas.width, newExtraCanvas.height)
    extraCanvas = newExtraCanvas
  }

  const drawBoundingBox = (object: Detection) => {
    // Draw the bounding box
    myP5.stroke(0, 255, 0)
    myP5.strokeWeight(4)
    myP5.noFill()
    myP5.rect(object.x, object.y, object.width, object.height)
  }

  const renderRemoteDrawing = (object: Detection) => {
    myP5.stroke(100, 0, 100)
    myP5.strokeWeight(4)
    myP5.noFill()
    for (var i = 0; i < drawing.length; i++) {
      var path = drawing[i]
      myP5.beginShape()
      for (var j = 0; j < path.length; j++) {
        let x = path[j].x * object.width + object.x
        let y = path[j].y * object.height + object.y
        myP5.vertex(x, y)
      }
      myP5.endShape()
    }
  }

  const draw = (p5: p5Types) => {
    p5.image(video, 0, 0, canvasWidth, canvasHeight)
    // Detection-based content rendering
    if (detections.length > 0) {
      let object = detections[0] as Detection
      if (object.score > threshold) {
        drawBoundingBox(object) // For testing
        if (object.label === 'starry_night') {
          remoteDrawingArtworkDetected = true
          artworkName = 'starry_night'
          // Remote drawing rendering - only for starry_night
          renderRemoteDrawing(object)
        } else if (object.label === 'the_scream') {
          remoteDrawingArtworkDetected = false
          artworkName = ''
          // Trigger logic for the_scream artwork
        } else if (object.label === 'monalisa') {
          remoteDrawingArtworkDetected = false
          artworkName = ''
          // Trigger logic for mona_lisa artwork
        } else {
          remoteDrawingArtworkDetected = false
          artworkName = ''
        }
      } else {
        remoteDrawingArtworkDetected = false
        artworkName = ''
      }
    }

    checkRenderEventContent()
  }

  const checkRenderEventContent = () => {
    // Event content rendering
    if (triggerEvent && triggerEventName) {
      // Set the timer for the fade out
      if (fadeOutFlag) {
        fadeOutFlag = false
        setTimeout(() => {
          fadeOut = true
        }, 5000)
      }

      if (triggerEventName === 'room1') {
        // render stuff for event 1
        myP5.stroke(0, 0, 0, contentAlpha)
        myP5.strokeWeight(2)
        myP5.fill(255, 255, 255, contentAlpha)
        myP5.textSize(64)
        myP5.textAlign('center')
        myP5.text('welcome to room1', canvas.width / 2, 50)
      } else if (triggerEventName === 'room2') {
        // render stuff for event 2
        myP5.stroke(0, 0, 0, contentAlpha)
        myP5.strokeWeight(2)
        myP5.fill(255, 255, 255, contentAlpha)
        myP5.textSize(64)
        myP5.textAlign('center')
        myP5.text('welcome to room1', canvas.width / 2, 50)
      } else if (triggerEventName === 'room3') {
        // render stuff for event 3
        myP5.stroke(0, 0, 0, contentAlpha)
        myP5.strokeWeight(2)
        myP5.fill(255, 255, 255, contentAlpha)
        myP5.textSize(64)
        myP5.textAlign('center')
        myP5.text('welcome to room1', canvas.width / 2, 50)
      }

      if (fadeOut) {
        contentAlpha -= 5
        if (contentAlpha === 0) {
          fadeOut = false
          contentAlpha = 255
          triggerEvent = false
          triggerEventName = ''
        }
      }
    }
  }

  const checkRoomChange = (roomName: string) => {
    // console.log('current room:', roomName)
    if (roomName !== '' && !visitedRooms.includes(roomName)) {
      visitedRooms.push(roomName)
      triggerEventName = roomName
      triggerEvent = true
      fadeOutFlag = true
    }
  }

  function requestRoomId() {
    if (tagId && !triggerEvent) {
      fetch(SERVER_URL + ':' + SERVER_PORT + `/anchor/getRoomFromATag/${tagId}`, {
        method: 'GET',
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
      })
        .then(response => {
          return response.json()
        })
        .then(data => {
          // Track changes in rooms and trigger events related to the change
          // Each event will have its own actions triggered (rendering/sound)
          checkRoomChange(data)
        })
    }
  }

  function requestDrawing() {
    if (remoteDrawingArtworkDetected) {
      fetch(SERVER_URL + ':' + SERVER_PORT + `/artwork/${artworkName}`, {
        method: 'GET',
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
      })
        .then(response => {
          return response.json()
        })
        .then(data => {
          // Process response and update drawing variable
          if ('draw' in data) {
            let drawData = JSON.parse(data.draw)
            drawing = drawData
          }
        })
    }
  }

  const initRemoteDrawing = () => {
    remoteDrawingInterval = setInterval(requestDrawing, 1000)
  }

  const initRequestRoom = () => {
    requestRoomInterval = setInterval(requestRoomId, 1000)
  }

  useEffect(() => {
    return () => {
      // Cleanup operations
      clearInterval(remoteDrawingInterval)
      clearInterval(requestRoomInterval)
      detectionsLoop = false
    }
  }, [])

  return <Sketch setup={setup} draw={draw} windowResized={windowResized} />
}

export default React.memo(VideoCanvas)
