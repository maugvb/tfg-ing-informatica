import numpy
import gi
gi.require_version('Gst', '1.0')
gi.require_version('GstApp', '1.0')
from gi.repository import Gst, GstApp, GLib
from threading import Thread
import cv2
import torch
from av import VideoFrame

import janus

Gst.init()

# Precictor to make the object detection on the frames
predictor = torch.hub.load('ultralytics/yolov5', 'yolov5s')  # yolov5s or yolov5m, yolov5x, custom
frame_count = 0
frame_threshold = 5
# Global variable holding the image array
image_arr = None

def gst_to_opencv(sample):
    buf = sample.get_buffer()
    caps = sample.get_caps()

    # print(caps.get_structure(0).get_value('format'))
    # print(caps.get_structure(0).get_value('height'))
    # print(caps.get_structure(0).get_value('width'))
    # print(buf.get_size())

    arr = numpy.ndarray(
        (caps.get_structure(0).get_value('height'),
         caps.get_structure(0).get_value('width'),
         3),
        buffer=buf.extract_dup(0, buf.get_size()),
        dtype=numpy.uint8)
    return arr


main_loop = GLib.MainLoop()
main_loop_thread = Thread(target=main_loop.run)
main_loop_thread.start()

pipeline = Gst.parse_launch('udpsrc port=6001 caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)96" ! queue ! rtpvp8depay ! decodebin ! videoconvert ! video/x-raw, format=BGR ! appsink name=sink sync=true max-buffers=1 drop=true')
appsink = pipeline.get_by_name("sink")
pipeline.set_state(Gst.State.PLAYING)

try:
    while True:
        sample = appsink.try_pull_sample(Gst.SECOND)

        if sample is None:
            continue
    
        # Convert the sample to a numpy array to manage with cv2
        frame = gst_to_opencv(sample)

        # Determine whether its a frame where a detection should be performed
        if (frame_count < frame_threshold):
            # No detection -> do nothing
            frame_count += 1
            new_frame = sample
        else:
            # Detection -> Apply predictor to frame and rendet the results on it
            image = frame
            outputs = predictor(image) # Apply predictor
            outputs.render() # Render predictor results on the frame

            # Prepare output in the new_frame variable
            new_frame = VideoFrame.from_ndarray(outputs.imgs[0], format="bgr24")
            # new_frame.pts = frame.pts
            # new_frame.time_base = frame.time_base
            frame_count = 0
except KeyboardInterrupt:
    pass

pipeline.set_state(Gst.State.NULL)
main_loop.quit()
main_loop_thread.join()
