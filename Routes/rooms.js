import {mongoose,Schema} from "mongoose";
import express from "express";
import { createRooms, getRoomById, voteById } from "../Controllers/roomsController.js";
const router = express.Router();

router.get("/:id",getRoomById)
router.patch("/:id",voteById)
router.post("/",createRooms)

export default router;