FROM nvidia/cuda:11.3.1-devel-ubuntu20.04

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -y \
  python3-opencv ca-certificates python3-dev git net-tools traceroute netcat wget curl tcpdump libgl1 libglib2.0-0 libavdevice-dev libavfilter-dev libopus-dev libvpx-dev pkg-config libsrtp2-dev \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-doc \
  gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl \
  gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio && \
  rm -rf /var/lib/apt/lists/*

# create a non-root user
ARG USER_ID=1001
RUN useradd -m --no-log-init --system --uid ${USER_ID} hpc -g sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER hpc

WORKDIR /home/hpc

ENV PATH="/home/hpc/.local/bin:${PATH}"
RUN wget https://bootstrap.pypa.io/get-pip.py && \
  python3 get-pip.py --user && \
  pip install --upgrade pip && \
  rm get-pip.py

COPY requirements.txt requirements.txt
RUN pip3 install --user -r requirements.txt
RUN pip3 install --user 'git+https://github.com/facebookresearch/detectron2.git'

RUN mkdir /home/hpc/.streamlit
RUN chown -R hpc /home/hpc/.streamlit
# RUN chown -R hpc /home/hpc/webrtc/data/models/yolov5

CMD bash -C '/home/hpc/start.sh';'bash'