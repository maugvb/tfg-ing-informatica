# coding: utf-8

from __future__ import absolute_import
from datetime import date, datetime  # noqa: F401

from typing import List, Dict  # noqa: F401


from ..config.config import db, ma 
from ..models.tag import Tag  # noqa: F401,E501

## User model
class User(db.Model):
    # Name of the table in the database
    __tablename__ = "USERS"
    # Primary key of the table
    user_id = db.Column(db.Integer, primary_key=True, unique=True)
    # Username of the user
    username = db.Column(db.String(255), nullable=False)
    #Last seen of the user
    last_seen = db.Column(db.String(100))
    # chat_id from react
    chat_id = db.Column(db.String(20), nullable=True)
    #Boolean to know if the user is active or not
    active = db.Column(db.Boolean, default=True)
    #Foreign key to the tag table.
    uwb_id = db.Column(db.String(20), db.ForeignKey(Tag.alias))

## User Schema
class UserSchema(ma.SQLAlchemyAutoSchema):
        class Meta:
            model = User
            load_instance = True
            sqla_session = db.session 
            include_fk = True

# Create table
db.create_all()

