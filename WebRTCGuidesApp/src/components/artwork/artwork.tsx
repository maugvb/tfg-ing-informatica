import React from 'react'
// p5
import Sketch from 'react-p5'
import p5Types from 'p5'
// tfjs
import * as tf from '@tensorflow/tfjs'
import { loadGraphModel } from '@tensorflow/tfjs-converter'
import modelURL from '../../assets/model/model.json?url'

import './artwork.scss'
import configData from '../../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT

interface Detection {
  class: number
  label: string
  score: number
  x: number
  y: number
  width: number
  height: number
}

let canvasWidth, canvasHeight, img, canvas, extraCanvas, myP5, detector, detection, modelPromise
let detections: any[] = []
var drawing: any[] = []
var currentPath: any[] = []
var isDrawing = false

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

interface ComponentProps {
  artworkName: string
  goBack: () => void
}

const Artwork: React.FC<ComponentProps> = ({ artworkName, goBack }) => {
  // Artwork info
  const artworkId = artworkName
  const imgURL = 'assets/' + artworkName + '.jpg'

  // See annotations in JS for more information
  const setup = (p5: p5Types, canvasParentRef: Element) => {
    // Reference the p5 variable to a variable with global scope to be accessed
    // outside the p5 methods.
    myP5 = p5
    img = p5.loadImage(imgURL, () => {
      // Calculate canvas size
      canvasWidth = img.width > 640 ? 640 : img.width
      canvasHeight = img.height > 480 ? 480 : img.height
      // Create video canvas and put it in the correct container
      canvas = p5.createCanvas(canvasWidth, canvasHeight)
      canvas.parent(canvasParentRef)
      canvas.mousePressed(startPath)
      canvas.mouseReleased(endPath)
      // Paint the image of the artwork in the canvas
      p5.image(img, 0, 0, canvasWidth, canvasHeight)

      // Buttons
      p5.createButton('Clear').mouseClicked(clearDrawing).parent(canvasParentRef).addClass('btn button-primary') // clear the drawing
      p5.createButton('Save').mouseClicked(saveDrawing).parent(canvasParentRef).addClass('btn button-primary') // save the drawing
      p5.createButton('Create').mouseClicked(createDrawing).parent(canvasParentRef).addClass('btn button-primary') // create the drawing in the DDBB

      modelPromise = load_model()

      // With model and image loaded, perform the detection
      Promise.all([modelPromise])
        .then(values => {
          detector = values[0]
          detectImage(() => {
            // Bbox rendering
            if (detections.length > 0) {
              detection = detections[0] as Detection
              p5.stroke(255, 0, 0)
              p5.strokeWeight(1)
              p5.noFill()
              p5.rect(detection.x, detection.y, detection.width, detection.height)
            }
            // Create drawing canvas and set it to be transparent
            extraCanvas = p5.createGraphics(detection.width, detection.height).clear()
          })
        })
        .catch(error => {
          console.error(error)
        })
    })
  }

  async function load_model() {
    const model = await loadGraphModel(modelURL)
    return model
  }

  const process_input = image => {
    const tfimg = tf.browser.fromPixels(image).toInt()
    const expandedimg = tfimg.transpose([0, 1, 2]).expandDims()
    return expandedimg
  }

  const detectImage = callback => {
    tf.engine().startScope()
    console.log('img', img)
    detector.executeAsync(process_input(img.canvas)).then(predictions => {
      savePredictions(predictions)
      tf.engine().endScope()
      callback()
    })
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
    return detectionObjects
  }

  const savePredictions = predictions => {
    // PRINT PREDICTION TENSORS
    // for (let i = 0; i < predictions.length; i++) {
    //   console.log('i:', i)
    //   predictions[i].print()
    // }

    // Getting predictions
    const boxes = predictions[6].arraySync()
    const scores = predictions[7].arraySync()
    const classes = predictions[5].dataSync()
    detections = buildDetectedObjects(scores, threshold, boxes, classes, classesDir)
  }

  function windowResized(p5: p5Types) {
    // Get new size
    let parentContainer = document.querySelector('.react-p5') as HTMLElement
    canvasWidth = parentContainer.offsetWidth
    canvasHeight = parentContainer.offsetHeight
    // Resize canvas
    p5.resizeCanvas(canvasWidth, canvasHeight)
    p5.image(img, 0, 0)
    // Resize graphics
    let newExtraCanvas = p5.createGraphics(detection.width, detection.height)
    newExtraCanvas.image(extraCanvas, 0, 0, detection.width, detection.height)
    extraCanvas = newExtraCanvas
  }

  function startPath() {
    isDrawing = true
    currentPath = []
    drawing.push(currentPath)
  }

  function endPath() {
    isDrawing = false
  }

  function pushIfNotExists(list, element) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].x === element.x && list[i].y === element.y) {
        return list
      }
    }
    list.push(element)
    return list
  }

  const draw = (p5: p5Types) => {
    if (extraCanvas) {
      if (isDrawing) {
        let posX = p5.mouseX
        let posY = p5.mouseY
        // Draw only if the mouse is in the Bbox
        if (
          detection.x <= posX &&
          posX <= detection.x + detection.width &&
          detection.y <= posY &&
          posY <= detection.y + detection.height
        ) {
          var point = {
            x: ((posX - detection.x) / detection.width).toFixed(2),
            y: ((posY - detection.y) / detection.height).toFixed(2)
          }
          currentPath = pushIfNotExists(currentPath, point)
        }
      }
      extraCanvas.stroke(100, 0, 100)
      extraCanvas.strokeWeight(4)
      extraCanvas.noFill()
      for (var i = 0; i < drawing.length; i++) {
        var path = drawing[i]
        extraCanvas.beginShape()
        for (var j = 0; j < path.length; j++) {
          extraCanvas.vertex(path[j].x * detection.width, path[j].y * detection.height)
        }
        extraCanvas.endShape()
      }
      p5.image(extraCanvas, detection.x, detection.y)
    }
  }

  function clearDrawing() {
    myP5.image(img, 0, 0, canvasWidth, canvasHeight)
    extraCanvas.clear()
    extraCanvas = myP5.createGraphics(detection.width, detection.height)
    drawing = []
    // Bbox rendering
    myP5.stroke(255, 0, 0)
    myP5.strokeWeight(1)
    myP5.noFill()
    myP5.rect(detection.x, detection.y, detection.width, detection.height)
  }

  async function createDrawing() {
    console.log('createDrawing')
    let response = await fetch(SERVER_URL + ':' + SERVER_PORT + `/artwork`, {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      body: JSON.stringify({ name: artworkId, draw: '{}' })
    })
    console.log('response', response)
  }

  async function saveDrawing() {
    console.log('saveDrawing')
    let response = await fetch(SERVER_URL + ':' + SERVER_PORT + `/artwork/${artworkId}`, {
      method: 'PUT',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      body: JSON.stringify({ name: artworkId, draw: JSON.stringify(drawing) })
    })
    console.log('response', response)
    // Repeat request after 1 second
    setTimeout(() => {
      saveDrawing()
    }, 1000)
  }

  return (
    <>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      <button className="btn button-primary back" onClick={goBack}>
        Go Back
      </button>
    </>
  )
}

export default React.memo(Artwork)
