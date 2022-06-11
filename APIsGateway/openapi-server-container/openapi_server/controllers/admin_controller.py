#import connexion
import six

from openapi_server.models.user import User  # noqa: E501
#from swagger_server.models.userpropertiesusername import Userpropertiesusername  # noqa: E501
from openapi_server.models.user import User, UserSchema  # noqa: E501
from openapi_server.models.room import RoomSchema  # noqa: E501
from openapi_server.config.config import db

############# Never used #############
def create_user(body):  # noqa: E501
    """Create a new user

    Create a new user # noqa: E501

    :param body: 
    :type body: dict | bytes

    :rtype: User
    """
    user = None
    if body["uwb_id"] != None:
        user = User.query.filter( User.uwb_id == body["uwb_id"]).first()
    if user:
        return "User already attached to a Anchor(Tag)", 200
    else:
        schema = UserSchema()
        #Apply data treatment
        newUser = schema.load(body, session=db.session)
        db.session.add(newUser)
        db.session.commit()

        data = schema.dump(newUser)

        
        return data, 200

############# Never used #############

def create_user_with_list(body):  # noqa: E501
    """Creates list of users with given input array

    Creates list of users with given input array # noqa: E501

    :param body: 
    :type body: list | bytes

    :rtype: User
    """

    data = []
    for u in body:
        schema = UserSchema()
        #Apply data treatment
        
        newUser = schema.load(u, session=db.session)
        db.session.add(newUser)
        db.session.commit()
        user = User.query.filter( User.username == u["username"]).one()
        data.append(schema.dump(user))

    
    return data, 200

############# Never used #############

def delete_user_by_username(username):  # noqa: E501
    """Delete a user by username

    Delete a user by username # noqa: E501

    :param username: Username of the user
    :type username: dict | bytes

    :rtype: None
    """
    user = User.query.filter( User.username == username).one()
    db.session.delete(user)

    db.session.commit()

    userSchema = UserSchema()
    data = userSchema.dump(user)
    return data, 200

############# Never used #############

def get_user_by_username(username):  # noqa: E501
    """Get a user by username

    Get a user by username # noqa: E501

    :param username: Username of the user
    :type username: dict | bytes

    :rtype: User
    """
    user = User.query.filter( User.username == username).first()

    userSchema = UserSchema()
    data = userSchema.dump(user)

    return data, 200

    




############# Never used #############

def login_user(username=None, password=None):  # noqa: E501
    """Logs user into the system

     # noqa: E501

    :param username: The user name for login
    :type username: str
    :param password: The password for login in clear text
    :type password: str

    :rtype: str
    """
    return 'do some magic!'

############# Never used #############

def logout_user():  # noqa: E501
    """Logs out current logged in user session

     # noqa: E501


    :rtype: None
    """
    return 'do some magic!'

############# Never used #############

def update_user_by_username(username, body=None):  # noqa: E501
    """Update a user by username

    Update a user by username # noqa: E501

    :param username: Username of the user
    :type username: dict | bytes
    :param body: Update an existent user in db
    :type body: dict | bytes

    :rtype: User
    """
    user = None
    if body.get('uwb_id'):
        user = User.query.filter( User.uwb_id == body["uwb_id"]).first()
    if user and body["uwb_id"]!= None and user.username != username:
        return "User already attached to a Anchor(Tag)", 200
    else:

        user = User.query.filter( User.username == username).update(body)

        db.session.commit()
        user = User.query.filter( User.username == username).first()

        userSchema = UserSchema()
        data = userSchema.dump(user)

        return data, 200
        
############# Never used #############

def create_room(body=None):  # noqa: E501
    """Create a new room

    Create a new room # noqa: E501

    :param body: Create a new room
    :type body: dict | bytes

    :rtype: Room
    """
    schema = RoomSchema()

    newRoom = schema.load(body, session=db.session)
    db.session.add(newRoom)
    data = schema.dump(newRoom)

    db.session.commit()

    return data, 200
