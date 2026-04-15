import express from 'express';
import asyncHandler from 'express-async-handler';
import { getArtists, createArtist, deleteArtist, updateArtist } from '../controllers/artistController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(asyncHandler(getArtists)).post(protect, asyncHandler(createArtist));
router.route('/:id')
  .delete(protect, admin, asyncHandler(deleteArtist))
  .put(protect, admin, asyncHandler(updateArtist));

export default router;
