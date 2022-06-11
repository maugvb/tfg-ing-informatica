from ..config.config import db, ma 

## Artwork model
class Artwork(db.Model):
    # Name of the table in the database
    __tablename__ = "ARTWORKS"
    # Primary key of the table
    artwork_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # Name of the artwork
    name = db.Column(db.String(50))
    # Description of the artwork
    draw = db.Column(db.String(40000))


## Artwork Schema
class ArtworkSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Artwork
        load_instance = True
        sqla_session = db.session

# Create table
db.create_all()