import Artist from '../models/Artist.js';

// @desc    Get all artists
// @route   GET /api/artists
// @access  Public
const getArtists = async (req, res) => {
  const artists = await Artist.find({});
  res.json(artists);
};

// @desc    Create an artist
// @route   POST /api/artists
// @access  Private
const createArtist = async (req, res) => {
  const { name, bio, imageUrl } = req.body;

  const artist = new Artist({
    name,
    bio,
    imageUrl,
  });

  const createdArtist = await artist.save();
  res.status(201).json(createdArtist);
};

// @desc    Delete an artist
// @route   DELETE /api/artists/:id
// @access  Private/Admin
const deleteArtist = async (req, res) => {
  const artist = await Artist.findById(req.params.id);

  if (artist) {
    await artist.deleteOne();
    res.json({ message: 'Artist removed' });
  } else {
    res.status(404).json({ message: 'Artist not found' });
  }
};

// @desc    Update an artist
// @route   PUT /api/artists/:id
// @access  Private/Admin
const updateArtist = async (req, res) => {
  const { name, bio, imageUrl } = req.body;

  const artist = await Artist.findById(req.params.id);

  if (artist) {
    artist.name = name || artist.name;
    artist.bio = bio || artist.bio;
    artist.imageUrl = imageUrl || artist.imageUrl;

    const updatedArtist = await artist.save();
    res.json(updatedArtist);
  } else {
    res.status(404).json({ message: 'Artist not found' });
  }
};

export { getArtists, createArtist, deleteArtist, updateArtist };
