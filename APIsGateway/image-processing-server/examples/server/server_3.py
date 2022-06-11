import argparse
import asyncio
from distutils.log import debug
import json
import logging
import os
import ssl
import uuid

import gi
gi.require_version('Gst', '1.0')
from gi.repository import Gst
import cv2
import numpy
from aiohttp import web
from av import VideoFrame
import torch

from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaPlayer, MediaRecorder, MediaRelay

# ROOT = os.path.dirname(__file__)

# logger = logging.getLogger("pc")
# pcs = set()
# relay = MediaRelay()


Gst.init(None)

image_arr = None


def gst_to_opencv(sample):
    buf = sample.get_buffer()
    caps = sample.get_caps()
    print(caps.get_structure(0).get_value('format'))
    print(caps.get_structure(0).get_value('height'))
    print(caps.get_structure(0).get_value('width'))

    print(buf.get_size())

    arr = numpy.ndarray(
        (caps.get_structure(0).get_value('height'),
         caps.get_structure(0).get_value('width'),
         3),
        buffer=buf.extract_dup(0, buf.get_size()),
        dtype=numpy.uint8)
    return arr


def new_buffer(sink, data):
    global image_arr
    sample = sink.emit("pull-sample")
    # buf = sample.get_buffer()
    # print "Timestamp: ", buf.pts
    arr = gst_to_opencv(sample)
    image_arr = arr
    return Gst.FlowReturn.OK


# Create the elements
source = Gst.ElementFactory.make("udpsrc", "source")
convert = Gst.ElementFactory.make("videoconvert", "convert")
sink = Gst.ElementFactory.make("autovideosink", "sink")
print("source")
print(source)
print("convert")
print(convert)
print("sink")
print(sink)

# Create the empty pipeline
pipeline = Gst.Pipeline.new("rtp-pipeline")
print("pipeline")
print(pipeline)

if not source or not sink or not pipeline:
    print("Not all elements could be created.")
    exit(-1)

sink.set_property("emit-signals", True)
# sink.set_property("max-buffers", 2)
# sink.set_property("drop", True)
# sink.set_property("sync", False)

caps = Gst.caps_from_string(
    "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)96")

sink.set_property("caps", caps)

sink.connect("new-sample", new_buffer, sink)

# Build the pipeline
pipeline.add(source)
pipeline.add(convert)
pipeline.add(sink)
if not Gst.Element.link(source, convert):
    print("Elements could not be linked.")
    exit(-1)

if not Gst.Element.link(convert, sink):
    print("Elements could not be linked.")
    exit(-1)

# Modify the source's properties
# HD1080 25p
source.set_property("mode", 7)
# SDI
source.set_property("connection", 0)

# Start playing
ret = pipeline.set_state(Gst.State.PLAYING)
if ret == Gst.StateChangeReturn.FAILURE:
    print("Unable to set the pipeline to the playing state.")
    exit(-1)

# Wait until error or EOS
bus = pipeline.get_bus()

# Parse message
while True:
    message = bus.timed_pop_filtered(10000, Gst.MessageType.ANY)
    # print "image_arr: ", image_arr
    if image_arr is not None:
        cv2.imshow("appsink image arr", image_arr)
        cv2.waitKey(1)
    if message:
        if message.type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            print(("Error received from element %s: %s" % (
                message.src.get_name(), err)))
            print(("Debugging information: %s" % debug))
            break
        elif message.type == Gst.MessageType.EOS:
            print("End-Of-Stream reached.")
            break
        elif message.type == Gst.MessageType.STATE_CHANGED:
            if isinstance(message.src, Gst.Pipeline):
                old_state, new_state, pending_state = message.parse_state_changed()
                print(("Pipeline state changed from %s to %s." %
                       (old_state.value_nick, new_state.value_nick)))
        else:
            print("Unexpected message received.")

# Free resources
pipeline.set_state(Gst.State.NULL)

# class VideoListener():
#     def __init__(self) -> None:
#         super().__init__()  # don't forget this!
#         self.predictor = torch.hub.load('ultralytics/yolov5', 'yolov5s')  # yolov5s or yolov5m, yolov5x, custom
#         self.frame_threshold = 5
#         self.frame_count = 0

#     def listenVideo(self):
        # gst_str = 'udpsrc port=6002 caps=application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)96 ! rtpjitterbuffer latency=50 ! rtpvp8depay ! decodebin ! videoconvert ! appsink'
        # gst_str = 'udpsrc port=6002 caps=application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)96 ! rtpjitterbuffer latency=50 ! rtpvp8depay ! decodebin ! videoconvert ! videoscale ! video/x-raw,width=640,height=400,format=BGR ! appsink'
        # capture = cv2.VideoCapture()
        # print(capture)
        # capture.open()
        # capture.open(gst_str, cv2.CAP_GSTREAMER)

        # print('Listening to video now.')
        # while capture.isOpened():
        #     ret, frame = capture.read()
        #     # Wait for the next frame
        #     if not ret:
        #         print('No frame')
        #         continue

        #     cv2.imshow('webCam', frame)
        #     if (self.frame_count < self.frame_threshold):
        #         self.frame_count += 1
        #         print(self.frameCount)
        #         new_frame = frame
        #     else:
        #         image = frame.to_ndarray(format="bgr24")
        #         # Apply predictor
        #         outputs = self.predictor(image)
        #         # Render predictor results on the frame
        #         outputs.render()
        #         # Prepare output in the new_frame variable
        #         new_frame = VideoFrame.from_ndarray(outputs.imgs[0], format="bgr24")
        #         new_frame.pts = frame.pts
        #         new_frame.time_base = frame.time_base
        #         self.frame_count = 0

        #     # We have the frame ready to display
        #     print(new_frame)

        #     if cv2.waitKey(1) & 0XFF == ord('q'):
        #         break
        # print('Ended listening to video.')
        # capture.release()
        # cv2.destroyAllWindows()


# class VideoTransformTrack(MediaStreamTrack):
#     """
#     A video stream track that transforms frames from an another track.
#     """

#     kind = "video"

#     def __init__(self, track, transform):
#         super().__init__()  # don't forget this!
#         self.track = track
#         self.transform = transform
#         self.predictor = torch.hub.load('ultralytics/yolov5', 'yolov5s')  # yolov5s or yolov5m, yolov5x, custom
#         self.frame_threshold = 5
#         self.frame_count = 0

#     async def recv(self):
#         frame = await self.track.recv()

#         if self.transform == "cartoon":
#             img = frame.to_ndarray(format="bgr24")

#             # prepare color
#             img_color = cv2.pyrDown(cv2.pyrDown(img))
#             for _ in range(6):
#                 img_color = cv2.bilateralFilter(img_color, 9, 9, 7)
#             img_color = cv2.pyrUp(cv2.pyrUp(img_color))

#             # prepare edges
#             img_edges = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
#             img_edges = cv2.adaptiveThreshold(
#                 cv2.medianBlur(img_edges, 7),
#                 255,
#                 cv2.ADAPTIVE_THRESH_MEAN_C,
#                 cv2.THRESH_BINARY,
#                 9,
#                 2,
#             )
#             img_edges = cv2.cvtColor(img_edges, cv2.COLOR_GRAY2RGB)

#             # combine color and edges
#             img = cv2.bitwise_and(img_color, img_edges)

#             # rebuild a VideoFrame, preserving timing information
#             new_frame = VideoFrame.from_ndarray(img, format="bgr24")
#             new_frame.pts = frame.pts
#             new_frame.time_base = frame.time_base
#             return new_frame
#         elif self.transform == "edges":
#             # perform edge detection
#             img = frame.to_ndarray(format="bgr24")
#             img = cv2.cvtColor(cv2.Canny(img, 100, 200), cv2.COLOR_GRAY2BGR)

#             # rebuild a VideoFrame, preserving timing information
#             new_frame = VideoFrame.from_ndarray(img, format="bgr24")
#             new_frame.pts = frame.pts
#             new_frame.time_base = frame.time_base
#             return new_frame
#         elif self.transform == "rotate":
#             # rotate image
#             img = frame.to_ndarray(format="bgr24")
#             rows, cols, _ = img.shape
#             M = cv2.getRotationMatrix2D((cols / 2, rows / 2), frame.time * 45, 1)
#             img = cv2.warpAffine(img, M, (cols, rows))

#             # rebuild a VideoFrame, preserving timing information
#             new_frame = VideoFrame.from_ndarray(img, format="bgr24")
#             new_frame.pts = frame.pts
#             new_frame.time_base = frame.time_base
#             return new_frame
#         elif self.transform == "yolo":
#             if (self.frame_count < self.frame_threshold):
#                 self.frame_count += 1
#                 return frame
#             else:
#                 image = frame.to_ndarray(format="bgr24")
#                 outputs = self.predictor(image)
#                 outputs.render()
#                 new_frame = VideoFrame.from_ndarray(outputs.imgs[0], format="bgr24")
#                 new_frame.pts = frame.pts
#                 new_frame.time_base = frame.time_base
#                 self.frame_count = 0
#                 return new_frame
#         else:
#             return frame


# async def index(request):
#     content = open(os.path.join(ROOT, "index.html"), "r").read()
#     return web.Response(content_type="text/html", text=content)


# async def javascript(request):
#     content = open(os.path.join(ROOT, "client.js"), "r").read()
#     return web.Response(content_type="application/javascript", text=content)


# async def offer(request):
#     params = await request.json()
#     offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

#     pc = RTCPeerConnection()
#     pc_id = "PeerConnection(%s)" % uuid.uuid4()
#     pcs.add(pc)

#     def log_info(msg, *args):
#         logger.info(pc_id + " " + msg, *args)

#     log_info("Created for %s", request.remote)

#     # prepare local media
#     player = MediaPlayer(os.path.join(ROOT, "demo-instruct.wav"))
#     if args.record_to:
#         recorder = MediaRecorder(args.record_to)
#     else:
#         recorder = MediaBlackhole()

#     @pc.on("datachannel")
#     def on_datachannel(channel):
#         @channel.on("message")
#         def on_message(message):
#             if isinstance(message, str) and message.startswith("ping"):
#                 channel.send("pong" + message[4:])

#     @pc.on("connectionstatechange")
#     async def on_connectionstatechange():
#         log_info("Connection state is %s", pc.connectionState)
#         if pc.connectionState == "failed":
#             await pc.close()
#             pcs.discard(pc)

#     @pc.on("track")
#     def on_track(track):
#         log_info("Track %s received", track.kind)

#         if track.kind == "audio":
#             pc.addTrack(player.audio)
#             recorder.addTrack(track)
#         elif track.kind == "video":
#             pc.addTrack(
#                 VideoTransformTrack(
#                     relay.subscribe(track), transform=params["video_transform"]
#                 )
#             )
#             if args.record_to:
#                 recorder.addTrack(relay.subscribe(track))

#         @track.on("ended")
#         async def on_ended():
#             log_info("Track %s ended", track.kind)
#             await recorder.stop()

#     # handle offer
#     await pc.setRemoteDescription(offer)
#     await recorder.start()

#     # send answer
#     answer = await pc.createAnswer()
#     await pc.setLocalDescription(answer)

#     return web.Response(
#         content_type="application/json",
#         text=json.dumps(
#             {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
#         ),
#     )


# async def on_shutdown(app):
#     # close peer connections
#     coros = [pc.close() for pc in pcs]
#     await asyncio.gather(*coros)
#     pcs.clear()

# if __name__ == "__main__":
    # parser = argparse.ArgumentParser(
    #     description="WebRTC audio / video / data-channels demo"
    # )
    # parser.add_argument("--cert-file", help="SSL certificate file (for HTTPS)")
    # parser.add_argument("--key-file", help="SSL key file (for HTTPS)")
    # parser.add_argument(
    #     "--host", default="0.0.0.0", help="Host for HTTP server (default: 0.0.0.0)"
    # )
    # parser.add_argument(
    #     "--port", type=int, default=8080, help="Port for HTTP server (default: 8080)"
    # )
    # parser.add_argument("--record-to", help="Write received media to a file."),
    # parser.add_argument("--verbose", "-v", action="count")
    # args = parser.parse_args()

    # if args.verbose:
    #     logging.basicConfig(level=logging.DEBUG)
    # else:
    #     logging.basicConfig(level=logging.INFO)

    # if args.cert_file:
    #     ssl_context = ssl.SSLContext()
    #     ssl_context.load_cert_chain(args.cert_file, args.key_file)
    # else:
    #     ssl_context = None

    # Create the video object
    # Initialize a sink on port 6002 to capture the forwarded video
    # listener = VideoListener()
    # listener.listenVideo()

    # app = web.Application()
    # app.on_shutdown.append(on_shutdown)
    # app.router.add_get("/", index)
    # app.router.add_get("/client.js", javascript)
    # app.router.add_post("/offer", offer)
    # web.run_app(
    #     app, access_log=None, host=args.host, port=args.port, ssl_context=ssl_context
    # )
