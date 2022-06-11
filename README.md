# Colosseum




To deploy the project:

1. Stop all services in the VM

```
    $ make stop
```

2. Update changes
3. Start services again

```
    $ make run-build
```

4. To make a clean (This will delete the db):

```
    $ make clean
```

To just run services:
```
    $ make run
```
## Docker Services

To run containers in APIsGateway folder:

```
    $ docker-compose up
```

To run a container:

```
    $ docker-compose up <TagServiceName>
```

To run any of the services tags:

- tile38-leader (Tile 38)
- tile38-follower (Tile 38)
- db (Mysql)
- app (App-Flask Endpoints)
- janus-server (Janus)
- detection-server (Image Processing Server)

## WebApp
In WebRTCGuideApp folder
To run WebApp in dev mode:

```
    $ yarn dev
```

To build WebApp:

```
    $ yarn build
```

If the previous command results in a JavaScript heap out of memory error, run the following workaround:
```
   $ node --max_old_space_size=4096 ./node_modules/vite/bin/vite.js build
```
