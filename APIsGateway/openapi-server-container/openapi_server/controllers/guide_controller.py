from openapi_server.models.anchor import Anchor  # noqa: E501
#from swagger_server.models.anchorpropertiesalias import Anchorpropertiesalias  # noqa: E501
from openapi_server.models.tag import Tag  # noqa: E501
#from swagger_server.models.tagpropertiesalias import Tagpropertiesalias  # noqa: E501
from openapi_server.models.user import User  # noqa: E501
#from swagger_server.models.userpropertiesusername import Userpropertiesusername  # noqa: E501
from openapi_server.models.artwork import Artwork  # noqa: E501

from openapi_server.models.user import User, UserSchema  # noqa: E501
from openapi_server.models.tag import Tag, TagSchema  # noqa: E501
from openapi_server.models.anchor import Anchor, AnchorSchema  # noqa: E501
from openapi_server.models.room import Room, RoomSchema  # noqa: E501
from openapi_server.models.artwork import Artwork, ArtworkSchema  # noqa: E501
from openapi_server.config.config import db
import json

from pyle38 import Tile38

## Function that creates an anchor.
def create_anchor(body): 
    """Create a new anchor

    Create a new anchor # noqa: E501

    :param body: Anchor  attributes.
    :type body: dict | bytes

    :rtype: Anchor
    """
    #Anchor schema
    schema = AnchorSchema()
    #load data in the db session
    newAnchor = schema.load(body, session=db.session)
    #add the new anchor to the db session
    db.session.add(newAnchor)
    #get the data from the db session
    data = schema.dump(newAnchor)
    #commit the data to the db
    db.session.commit()

    return data, 200
    

##Function that creates an anchor from alist.
def create_anchor_with_list(body):  
    """Creates list of anchors with given input array

    Creates list of anchors with given input array # noqa: E501

    :param body: 
    :type body: list | bytes

    :rtype: Anchor
    """
    data = []
    for a in body:
        #Anchor schema
        schema = AnchorSchema()
        #load data in the db session
        newAnchor = schema.load(a, session=db.session)
        #add the new anchor to the db session
        db.session.add(newAnchor)
        #get the data from the db session
        data.append(schema.dump(newAnchor))
        #commit the data to the db
        db.session.commit()

    
    return data, 200

##Function that creates a tag.
async def create_tag(body):
    """Create a new tag

    Create a new tag # noqa: E501

    :param body: 
    :type body: dict | bytes

    :rtype: Tag
    """
    #Tag schema
    schema = TagSchema()
    #Get tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")

    #Load data in the db session
    newTag= schema.load(body, session=db.session)
    #Add the new tag to the db session
    db.session.add(newTag)
    #Get the data from the db session
    data = schema.dump(newTag)
    #Set data in tile38
    await tile38.set("tags", body["alias"]).object(json.loads(body["coordinates"])).exec()
    #Commit the data to the db
    db.session.commit()
    
    return data, 200


def create_tag_with_list(body): 
    """Creates list of tags with given input array

    Creates list of tags with given input array # noqa: E501

    :param body: 
    :type body: list | bytes

    :rtype: Tag
    """
    data = []
    for t in body:
        user_id = User.query.filter( User.username == t["user"]["username"]).one().user_id
        t["user"] = user_id
        schema = TagSchema()
        #Apply data treatment
        newTag = schema.load(t, session=db.session)
        db.session.add(newTag)
        data.append(schema.dump(newTag))
        db.session.commit()


    
    return data, 200

##Function that delete an anchor by alias.
def delete_anchor_by_alias(anchor_alias):
    """Delete anchor by alias

    Delete anchor by alias # noqa: E501

    :param anchor_id: Alias of the anchor
    :type anchor_id: string

    :rtype: Anchor
    """
    #Get the anchor by alias
    anchor = Anchor.query.filter( Anchor.alias == anchor_alias).one()
    #Delete the anchor
    db.session.delete(anchor)

    #Anchor schema
    anchorSchema = AnchorSchema()
    #Get the data from the db session
    data = anchorSchema.dump(anchor)
    #Commit the data to the db
    db.session.commit()

    return data, 200

##Function that delete a tag by alias.
async def delete_tag_by_alias(tag_alias):  # noqa: E501
    """Delete tag by alias

    Delete tag by alias # noqa: E501

    :param alias: Alias of the tag
    :type alias: string

    :rtype: Tag
    """
    #Get Tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #Get the tag by alias
    tag = Tag.query.filter( Tag.alias == tag_alias).one()
    #Delete the tag
    db.session.delete(tag)
    await tile38.delete(tag_alias)
    #Tag schema
    tagSchema = TagSchema()
    #Get the data from the db session
    data = tagSchema.dump(tag)
    #Commit the data to the db
    db.session.commit()

    return data, 200

## Function that get an anchor by id.
def get_anchor_by_id(anchor_id):
    """Get anchor by alias

    Get anchor by alias # noqa: E501

    :param anchor_id: Alias of the anchor
    :type anchor_id: number | bytes

    :rtype: Anchor
    """
    #Get the anchor by id
    anchor = Anchor.query.filter( Anchor.anchor_id == anchor_id).one()
    #Anchor schema
    anchorSchema = AnchorSchema()
    #Get the data from the db session
    data = anchorSchema.dump(anchor)

    return data, 200

#Function that get a Tag by alias.
def get_tag_by_alias(tag_alias):  # noqa: E501
    """Get tag by alias

    Get tag by alias # noqa: E501

    :param alias: Alias of the tag
    :type alias: string | bytes

    :rtype: Tag
    """
    #Get the tag by alias
    tag = Tag.query.filter( Tag.alias == tag_alias).first()
    #Tag schema
    tagSchema = TagSchema()
    #Get the data from the db session
    data = tagSchema.dump(tag)

    return data, 200
##Function that get all users.
def get_all_users():
    """Get all users

    Get all users # noqa: E501


    :rtype: List[User]
    """
    #Get all users
    users = User.query.all()
    #User schema
    userSchema = UserSchema(many=True)
    #Get as list the data from the db session
    data = userSchema.dump(users)

    return data, 200
    

## Funtion that get all anchors.
def get_all_tags_with_users():
    """Get all tags with users

    Get all tags with users # noqa: E501


    :rtype: List[Tag]
    """
    #Get all tags with users
    tags = Tag.query.filter(User.uwb_id == Tag.alias).all()
    #Tag schema
    tagSchema = TagSchema(many=True)
    #Get as list the data from the db session
    data = tagSchema.dump(tags)

    return data, 200


##Function that update an anchor by id.
def update_anchor_by_id(anchor_id, body=None):
    """Update anchor by alias

    Update anchor by alias # noqa: E501

    :param anchor_id: Alias of the anchor
    :type anchor_id: dict | bytes
    :param body: Update an existent anchor in db
    :type body: dict | bytes

    :rtype: Anchor
    """
    #Update the anchor by id
    anchor = Anchor.query.filter( Anchor.anchor_id == anchor_id).update(body)
    #Anchor schema
    db.session.commit()
    #Get the data from the db session
    anchor = Anchor.query.filter( Anchor.anchor_id == anchor_id).one()
    #Anchor schema
    anchorSchema = AnchorSchema()
    #Get the data from the db session
    data = anchorSchema.dump(anchor)
    

    return data, 200

##Function that update a tag by alias.
async def update_tag_by_alias(tag_alias, body=None):  # noqa: E501
    """Update tag by alias

    Update tag by alias # noqa: E501

    :param alias: Alias of the tag
    :type alias: dict | bytes
    :param body: Update an existent tag in db
    :type body: dict | bytes

    :rtype: Tag
    """
    #Update the tag by alias
    tag = Tag.query.filter( Tag.alias == tag_alias).update(body)
    #Commit the data to the db
    db.session.commit()
    #Get the tag by alias
    tag = Tag.query.filter( Tag.alias == tag_alias).one()
    #Tag schema
    tagSchema = TagSchema()
    #Get the data from the db session
    data = tagSchema.dump(tag)
    #If changed coordinates update the tile38
    if body["coordinates"] != None:
        tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
        await tile38.set("tags", tag_alias).object(json.loads(body["coordinates"])).exec()


    return data, 200

##Function that update a user by username.
def update_user_by_username(username, body=None):  # noqa: E501
    """Update a user by username

    Update a user by username # noqa: E501

    :param username: Username of the user
    :type username: dict | bytes
    :param body: Update an existent user in db
    :type body: dict | bytes

    :rtype: User
    """
    #Update the user by username
    user = User.query.filter( User.username == username).update(body)
    #Commit the data to the db
    db.session.commit()
    #Get the user by username
    user = User.query.filter( User.username == username).one()
    #User schema
    userSchema = UserSchema()
    #Get the data from the db session
    data = userSchema.dump(user)

    return data, 200

##Function that gets all tags.
def get_all_tags():  
    """Get all tags

    Get all tags # noqa: E501


    :rtype: List[Tag]
    """
    #Get all tags
    tags = Tag.query.all()
    #Tag schema
    tagSchema = TagSchema(many=True)
    #Get as list the data from the db session
    data = tagSchema.dump(tags)

    return data, 200
##Function that gets all anchors.
def get_all_anchors():  
    """Get all anchors

    Get all anchors # noqa: E501


    :rtype: List[Anchor]
    """
    #Get all anchors
    anchors = Anchor.query.all()
    #Anchor schema
    anchorSchema = AnchorSchema(many=True)
    #Get as list the data from the db session
    data = anchorSchema.dump(anchors)

    return data, 200
##Function that create a Room.
async def create_room(body=None):  # noqa: E501
    """Create a new room

    Create a new room # noqa: E501

    :param body: Create a new room
    :type body: dict | bytes

    :rtype: Room
    """
    #Room schema
    schema = RoomSchema()
    #Tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #load the data from the body
    newRoom = schema.load(body, session=db.session)
    #Commit the data to the db
    db.session.add(newRoom)
    #Commit the data to the db
    data = schema.dump(newRoom)
    geoJson = {

            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    json.loads(body["coordinates"])
                ]
            }
        }
    #Set the room in the tile38
    await tile38.set("rooms", body["alias"]).object(geoJson).exec()
    #Commit the data to the db
    db.session.commit()

    return data, 200
##Function that get all rooms.
def get_all_rooms():  
    """Get all rooms

    Get all rooms # noqa: E501


    :rtype: List[Room]
    """
    #Get all rooms
    rooms = Room.query.all()
    #Room schema
    roomSchema = RoomSchema(many=True)
    #Get as list the data from the db session
    data = roomSchema.dump(rooms)

    return data, 200

##Function that get a room by alias.
def get_room_by_alias(alias):  
    """Get room by id

    Get room by id # noqa: E501

    :param room_id: Id of the room
    :type room_id: dict | bytes

    :rtype: Room
    """
    #Get the room by alias
    room = Room.query.filter( Room.alias == alias).one()

    roomSchema = RoomSchema()
    data = roomSchema.dump(room)

    return data, 200

##Function that get a room by alias.
def update_room_by_alias(alias, body=None):  # noqa: E501
    """Update room by id

    Update room by id # noqa: E501

    :param room_id: Id of the room
    :type room_id: dict | bytes
    :param body: Update an existent room in db
    :type body: dict | bytes

    :rtype: Room
    """
    #Update the room by alias
    room = Room.query.filter( Room.alias == alias).update(body)
    #Commit the data to the db
    db.session.commit()
    #Get the room by alias
    room = Room.query.filter( Room.alias == alias).one()
    #Room schema
    roomSchema = RoomSchema()
    #Get the data from the db session
    data = roomSchema.dump(room)

    return data, 200
    
#Function that delete a room by alias.
async def delete_room_by_alias(room_alias):  # noqa: E501
    """Delete room by id

    Delete room by id # noqa: E501

    :param room_id: Id of the room
    :type room_id: dict | bytes

    :rtype: Room
    """
    #tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #Get the room by alias
    room = Room.query.filter( Room.alias == room_alias).one()
    #Delete the room from the db
    db.session.delete(room)
    #Delete the room from the tile38
    await tile38.delete('rooms',room_alias)
    #Commit the data to the db
    roomSchema = RoomSchema()
    #Get the data from the db session
    data = roomSchema.dump(room)
    #Commit the data to the db
    db.session.commit()

    return data, 200

#Function that get all users from a room by id.
async def get_all_users_from_room(room_id):
    """Get all users

    Get all users # noqa: E501


    :rtype: List[User]
    """
    
    #tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #Get the room by id
    room = Room.query.filter( Room.room_id == room_id).one()
    #Room schema
    roomSchema = RoomSchema()
    #Get the data from the db session
    roomObject = roomSchema.dump(room)
    #Get the room from the tile38
    response = await tile38.follower().get('rooms',roomObject["alias"]).asObject()
    data = {

        "numberUsers" : 0
    }
    #Get the number of users in the room
    r = await tile38.intersects('tags').object(response.dict()["object"]).asCount()
    #Set the number of users in the room
    data["numberUsers"] = r.dict()["count"]
    
    
    return data

##Function that gets an artwork.
def get_artwork_by_name(name):  # noqa: E501
    """Get artwork by name

    Get artwork by name # noqa: E501


    :rtype: List[Artwork]
    """
    #Get the artwork by name
    artwork = Artwork.query.filter( Artwork.name == name).first()
    #Artwork schema
    artworkSchema = ArtworkSchema()
    #Get the data from the db session
    data = artworkSchema.dump(artwork)

    return data, 200


##Function that update an artwork.
def update_artwork_by_name(name, body=None):  # noqa: E501
    """Update artwork by name

    Update artwork by name # noqa: E501

    :param name: Name of the artwork
    :type name: dict | bytes
    :param body: Update an existent artwork in db
    :type body: dict | bytes

    :rtype: Artwork
    """
    #Get the artwork by name
    artwork = Artwork.query.filter( Artwork.name == name).first()
    #If is None the artwork doesn't exist
    if artwork is None:
        return "Artwork not found", 404
    #Update the artwork in the db
    artwork = Artwork.query.filter( Artwork.name == name).update(body)
    #Commit the data to the db
    db.session.commit()
    #Get the artwork by name
    artwork = Artwork.query.filter( Artwork.name == name).first()
    #Artwork schema
    artworkSchema = ArtworkSchema()
    #Get the data from the db session
    data = artworkSchema.dump(artwork)

    return data, 200

##Functions that creates an artwork.
def create_artwork(body=None):  # noqa: E501
    """Create a new artwork

    Create a new artwork # noqa: E501

    :param body: Create a new artwork
    :type body: dict | bytes

    :rtype: Artwork
    """
    #Artwork schema
    schema = ArtworkSchema()
    #Get artwork from the name
    artwork = Artwork.query.filter( Artwork.name == body["name"]).first()
    #If is not None the artwork already exists
    if artwork is not None:
        return "Artwork already exists", 400
    #Load the data from the body
    newArtwork = schema.load(body, session=db.session)
    #add the artwork to the db
    db.session.add(newArtwork)
    #Get the artwork from the db session
    data = schema.dump(newArtwork)
    #Commit the data to the db
    db.session.commit()

    return data, 200
##Function that gets all users from a room by alias.
async def get_all_users_from_room(room_alias):  # noqa: E501
    """Get all users

    Get all users # noqa: E501


    :rtype: List[User]
    """
    
    #tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #Get the room by alias from the tile38
    response = await tile38.follower().get('rooms',room_alias).asObject()
    data = {

        "numberUsers" : 0
    }
    #Get the number of users in the room
    r = await tile38.intersects('tags').object(response.dict()["object"]).asCount()
    #Set the number of users in the room
    data["numberUsers"] = r.dict()["count"]
    
    
    return data
##Function that gets the room of a tag.
async def get_room_from_tag(tag_alias):  # noqa: E501
    """Get all users

    Get all users # noqa: E501


    """
    #tile38 client
    tile38 = Tile38(url="redis://tile38-leader:9851", follower_url="redis://tile38-follower:9852")
    #Get all the rooms from the tile38
    rooms = await tile38.scan('rooms').asObjects()
    rooms = rooms.dict()["objects"]
    roomData = ""
    for room in rooms:
        #Intersect the tag with the room
        response = await tile38.intersects('tags').object(room["object"]).asObjects()
        for i in range(len(response.dict()["objects"])):
            #If the tag is the same as the tag_alias the tag is in the room
            if response.dict()["objects"][i]["id"] == tag_alias:
                roomData = room["id"]

    return roomData