NPM = npm

DOCKERFILE=Dockerfile

DOCKECOMPOSERAPP=docker-compose



dev:
	cd APIsGateway && \
	sudo ${DOCKECOMPOSERAPP} down && \
	sudo ${DOCKECOMPOSERAPP} up -d db  && \
	sleep 20 && \
 	sudo ${DOCKECOMPOSERAPP} up -d api && \
	sudo ${DOCKECOMPOSERAPP} up -d janus-server && \
 	sudo ${DOCKECOMPOSERAPP} up -d tile38-leader && \
 	sudo ${DOCKECOMPOSERAPP} up -d tile38-follower

stop:
	cd APIsGateway && \
 	sudo ${DOCKECOMPOSERAPP} down 

run-build:
ifeq ($(ls -A APIsGateway/nginx-server/html), "")
	echo
else
	rm -rfv APIsGateway/nginx-server/html/* 
endif

	cd WebRTCGuidesApp && \
	sudo sudo yarn install && \
	sudo node --max_old_space_size=16384 ./node_modules/vite/bin/vite.js build && \
	sudo cp -r ./public/* ../APIsGateway/nginx-server/html && \
 	cd ../APIsGateway && \
	sudo ${DOCKECOMPOSERAPP} down && \
	sudo ${DOCKECOMPOSERAPP} up -d db  && \
	sleep 20 && \
 	sudo ${DOCKECOMPOSERAPP} up -d api && \
 	sudo ${DOCKECOMPOSERAPP} up -d nginx && \
	sudo ${DOCKECOMPOSERAPP} up -d janus-server && \
 	sudo ${DOCKECOMPOSERAPP} up -d tile38-leader && \
 	sudo ${DOCKECOMPOSERAPP} up -d tile38-follower

run:
	cd APIsGateway && \
	sudo ${DOCKECOMPOSERAPP} up -d db  && \
	sleep 20 && \
	sudo ${DOCKECOMPOSERAPP} up -d api && \
	sudo ${DOCKECOMPOSERAPP} up -d nginx && \
	sudo ${DOCKECOMPOSERAPP} up -d janus-server && \
	sudo ${DOCKECOMPOSERAPP} up -d tile38-leader && \
	sudo ${DOCKECOMPOSERAPP} up -d tile38-follower

clean: SHELL=/bin/bash -O extglob -c
clean:
	cd APIsGateway && \
 	sudo ${DOCKECOMPOSERAPP} down 
	cd APIsGateway/data/db && \
	sudo rm -r !(.gitkeep)
	


	