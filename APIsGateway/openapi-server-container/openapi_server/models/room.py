# coding: utf-8

from __future__ import absolute_import
from datetime import date, datetime  # noqa: F401
from typing import List, Dict  # noqa: F401
import asyncio
import json

from pyle38 import Tile38

from ..config.config import db, ma 
 
## Room model
class Room(db.Model):
    # Name of the table in the database
    __tablename__ = "ROOMS"
    # Primary key of the table
    room_id = db.Column(db.Integer, primary_key=True)
    # Name of the room
    alias = db.Column(db.String(20))
    # coordinates of the room GeoJSON format
    coordinates = db.Column(db.String(800))

## Room Schema
class RoomSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Room
        load_instance = True
        sqla_session = db.session



# Create table
db.create_all()

