import serial
import time
import math
import datetime
#import mysql.connector
import requests
import json
from pydoc import stripid

#mydb=mysql.connector.connect(user='root', password='root', host='192.168.10.105', database='colosseum')
#mydb=mysql.connector.connect(user='root', password='password', host='192.168.15.198', database='colosseum')
#sql = "INSERT INTO prueba_3 (anchor_id, pos_x, pos_y, pos_z, lattitude, longitude, timestamp) VALUES (%s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE pos_x = VALUES(pos_x), pos_y = VALUES(pos_y), pos_z = VALUES(pos_z), lattitude = VALUES(lattitude), longitude = VALUES(longitude), timestamp = VALUES(timestamp);"

tag_list = ["0425", "5206", "521E", "5A39", "8186", "8581", "9110", "DA32"]
user_list = ["0425", "5206", "521E", "5A39", "8186", "8581", "9110", "DA32"]
DWM=serial.Serial(port="/dev/ttyACM0", baudrate=115200,bytesize=serial.EIGHTBITS, stopbits=serial.STOPBITS_ONE, parity=serial.PARITY_NONE, timeout=None)
print("Connected to " +DWM.name)
DWM.write("\r\r".encode())
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
DWM.write("lec\r".encode())
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print(line)
time.sleep(0.25)
line=DWM.readline()
print("last", line)
while True:
    try:
        line=DWM.readline()
        if(line):
            parse=line.decode().split(",")
            anchor_id = parse[2]
            x_pos=-float(parse[parse.index("POS")+3])
            y_pos=float(parse[parse.index("POS")+4])
            z_pos=float(parse[parse.index("POS")+5])
            if(y_pos<0):
            	x_pos = x_pos + y_pos
            else:
                x_pos = x_pos - y_pos
            center_long =  43.29266383225503
            center_latt = -1.9864813297734907
            
            #lattitude = float(center_latt) + (120000*x_pos)
            #longitude = center_long + (120000*y_pos)
            
            angle = math.radians(107)
            diff_lattitude = ((y_pos*math.sin(angle)+x_pos*math.cos(angle))/110000)
            diff_longitude = ((y_pos*math.cos(angle)+x_pos*math.sin(angle))/150000)
            print(diff_lattitude, diff_longitude)
            lattitude = center_latt + diff_lattitude
            longitude  = center_long + diff_longitude
            
            #val = (anchor_id, lon, lat,str(datetime.datetime.now().strftime("%H:%M:%S")), x_pos,y_pos,z_pos)
            val = (anchor_id, x_pos,y_pos,z_pos, lattitude, longitude, str(datetime.datetime.now()))
            print(val)
            print(type(val[1]))
            if(type(val[1])==float):
                tag_id = tag_list.index(anchor_id)
                tag_id_2 = tag_id +50
                IP = 'http://192.168.10.111:8080'
                responseTag = requests.post(IP+'/tag', headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE', 'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'}, data=json.dumps({"tag_id": tag_id_2, "alias": anchor_id,"coordinates": stripid(json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[lattitude, longitude]}})),"last_update": str(datetime.datetime.now()),"latitude": lattitude,"longitude": longitude,"pos_x": x_pos,"pos_y" : y_pos,"pos_z" : z_pos}))
                #responseTag = requests.post(IP+'/tag', headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE', 'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'}, data=json.dumps({"tag_id": 54, "alias": "5252","coordinates": stripid(json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[center_latt, center_long]}})),"last_update": str(datetime.datetime.now()),"latitude": center_latt,"longitude": center_long,"pos_x": 2.25,"pos_y" : 2.25,"pos_z" : 2.2}))
                print(responseTag.text)
                #responseUser = requests.post(IP+'/user', headers={'Content-Type': 'application/json'}, data=json.dumps({"username": user_list[tag_id], "password": "test", "email": "admin@vicomtech.org","firstName": "test","lastName": "test","role": "admin","active": True,"uwb_id": anchor_id}))
                #print(responseUser.text)
    except Exception as ex:
        print(ex)
        break
DWM.write("\r".encode())
DWM.close()
