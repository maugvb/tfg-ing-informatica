# coding: utf-8

from __future__ import absolute_import
from datetime import date, datetime  # noqa: F401

from typing import List, Dict  # noqa: F401
from pyle38 import Tile38
import asyncio
import json


from ..config.config import db, ma 

class Tag(db.Model):



    __tablename__ = "TAGS"
   
    tag_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    alias = db.Column(db.String(20), index=True)
    coordinates = db.Column(db.String(800))
    latitude = db.Column(db.Float(50))
    longitude = db.Column(db.Float(50))
    last_update = db.Column(db.String(100))
    pos_x = db.Column(db.Float(5))
    pos_y = db.Column(db.Float(5))
    pos_z = db.Column(db.Float(5))

    #user = db.Column(db.Integer, db.ForeignKey('USERS.user_id'))
    #user = db.relationship('USERS', back_populates='tag')


class TagSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Tag
        load_instance = True
        #include_fk = True
        sqla_session = db.session

db.create_all()
class TagHistory(db.Model):
    # Name of the table in the database
    __tablename__ = "TAG_HISTORY"
    # Primary key of the table
    tag_id = db.Column(db.Integer, db.ForeignKey(Tag.tag_id), primary_key=True)
    # Alias of the tag
    alias = db.Column(db.String(20), db.ForeignKey(Tag.alias))
    # coordinates of the tag GeoJSON format
    coordinates = db.Column(db.String(800))
    #latitude of the tag
    latitude = db.Column(db.Float(50))
    #longitude of the tag
    longitude = db.Column(db.Float(50))
    #timestamp of the tag
    time_received = db.Column(db.String(100))
    #pos_x of the tag
    pos_x = db.Column(db.Float(5))
    #pos_y of the tag
    pos_y = db.Column(db.Float(5))
    #pos_z of the tag
    pos_z = db.Column(db.Float(5))




class TagHistorySchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = TagHistory
        load_instance = True
        include_fk = True
        sqla_session = db.session

# Create table
db.create_all()

