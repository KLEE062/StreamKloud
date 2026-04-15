import express from 'express';
import asyncHandler from 'express-async-handler';
import { getAlbums, createAlbum, deleteAlbum, updateAlbum } from '../controllers/albumController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(asyncHandler(getAlbums)).post(protect, asyncHandler(createAlbum));
router.route('/:id')
  .delete(protect, admin, asyncHandler(deleteAlbum))
  .put(protect, admin, asyncHandler(updateAlbum));

export default router;
