# Importing Modules
from pydoc import stripid
from matplotlib.font_manager import json_dump
import numpy as np
import random
# Use 'pip install shapely' to import the shapely library.
from shapely.geometry import Polygon, Point
#Use 'pip install requests' to import the requests library.
import requests
import json
import string    
import random # define the random module  
import time

#-1.9865405718391873,43.29296179481872
#-1.9863544282136627,43.292932663461954
#-1.9863100561570923,43.292628716324174
#-1.9864827905500397,43.292576478884314
# Define the desired polygon 

poly = Polygon([(-1.9865405718391873,43.29296179481872), (-1.9863544282136627,43.292932663461954),(-1.9863100561570923,43.292628716324174),(-1.9864827905500397,43.292576478884314)])

IP = 'http://localhost:8080'
prod = True
if prod == True:
    IP = 'http://192.168.15.192:8080'
def random_string(length, base):

    #S = 10  # number of characters in the string.  
    # call random.choices() string module to find the string in Uppercase + numeric data. 
    m = [1,2,3,4,5,6,7,8,9,0]
    for _ in range(length):
        
        base = base + str(random.choice(m))
    #Defining the randomization generator
    return base

def random_id(length):

    #S = 10  # number of characters in the string.  
    # call random.choices() string module to find the string in Uppercase + numeric data. 
    m = [1,2,3,4,5,6,7,8,9]
    base = ""
    for _ in range(length):
        
        base = base + str(random.choice(m))
    #Defining the randomization generator
    return int(base)
def polygon_random_points (poly, num_points):
    min_x, min_y, max_x, max_y = poly.bounds
    points = []
    while len(points) < num_points:
        x = random.uniform(min_x, max_x)
        y = random.uniform(min_y, max_y)
        random_point = Point([x, y])
        if (random_point.within(poly)):
            return x, y

# Choose the number of points desired. This example uses 20 points. 


print("Añadiendo tags y usuarios...\n")
for _ in range(150):


    tag_id = random_id(3)
    alias = random_string(9, 'tag')
    lat,lon = polygon_random_points(poly,1)
    print("TAG:")
    print(tag_id,alias,lat,lon)
    responseTag = requests.post(IP+'/tag', 
                                headers={'Content-Type': 'application/json'}, 
                                data=json.dumps({
                                    "tag_id": tag_id,
                                    "alias": alias,
                                    "coordinates": stripid(json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[lat, lon]}})),
                                })) 
    print(responseTag.text)
    username = random_string(9, 'user')
    responseUser = requests.post(IP+'/user', 
                            headers={'Content-Type': 'application/json'}, 
                            data=json.dumps({"username": username, 
                                            "password": "test", 
                                            "email": "admin@vicomtech.org",
                                            "firstName": "test",
                                            "lastName": "test",
                                            "role": "admin",
                                            "active": True,
                                            "uwb_id": alias}))
    print(responseUser.text)
    time.sleep(1)

print("Terminada la ejecucion....")