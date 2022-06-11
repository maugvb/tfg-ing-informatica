#!/usr/bin/env python3
from openapi_server.config.config import connexion_app
from flask_cors import CORS


def main():
    #Connexion app adding the yaml file
    connexion_app.add_api('swagger.yaml', arguments={'title': 'Colosseum'}, pythonic_params=True)
    #Cors wrapper
    CORS(connexion_app.app)
    #Run the app
    connexion_app.run(port=8080)

if __name__ == '__main__':
    main()
