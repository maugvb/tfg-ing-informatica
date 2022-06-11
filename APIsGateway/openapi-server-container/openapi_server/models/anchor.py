# coding: utf-8

from __future__ import absolute_import
from datetime import date, datetime
from re import A  # noqa: F401

from typing import List, Dict  # noqa: F401


from ..config.config import db, ma 
 
## Anchor model
class Anchor(db.Model):
    # Name of the table in the database
    __tablename__ = "ANCHORS"
    # Primary key of the table
    anchor_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    # latitude of the anchor
    latitude = db.Column(db.Float(50))
    # longitude of the anchor
    longitude = db.Column(db.Float(50))
    # alias of the anchor
    alias = db.Column(db.String(20))
    # position of the anchor in x axis
    pos_x = db.Column(db.Float(5))
    # position of the anchor in y axis
    pos_y = db.Column(db.Float(5))
    # position of the anchor in z axis
    pos_z = db.Column(db.Float(5))

## Schema of the anchors
class AnchorSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Anchor
        load_instance = True
        sqla_session = db.session

# Create table
db.create_all()

## Initialize the anchors
def init_anchors():
    coordinates = [
        [-1.986480255622072,43.292577827839295], # Sala 1 (oficina)
        [-1.9864379903255633,43.29259051305846], # Sala 1 (oficina)
        [-1.9864783297734907,43.29267983225503], # Sala 1 (oficina)
        [-1.9864672257672524,43.2927307447093], # Sala 2 (escaleras, pared del lab)
        [-1.986458203802483,43.2926991746026], # Sala 2 (escaleras, pared del lab)
        [-1.9864908323423205,43.292929786709635], # Sala 2 (escaleras, sobre la placa)

    ]
    # Add to the db
    if  db.session.query(Anchor).count() == 0:
        for i in range(len(coordinates)):
            anchor = Anchor(anchor_id=i, latitude=coordinates[i][0], longitude=coordinates[i][1], alias="Anchor"+str(i), pos_x=0, pos_y=0, pos_z=0)
            db.session.add(anchor)
        db.session.commit()
## Call the init_anchors function
init_anchors()