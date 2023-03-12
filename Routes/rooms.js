import {mongoose,Schema} from "mongoose";
import express from "express";
import { createRooms, getRoomById, voteById } from "../Controllers/roomsController.js";
const router = express.Router();
import jwt from "jsonwebtoken";
import * as dotenv from 'dotenv'
dotenv.config()

const verifyToken = (req,res,next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){
        res.send(401).send('Unauthorized')
    }
    jwt.verify(token,process.env.SECRET_KEY,(err,decoded)=>{
        if(err){
            res.status(401).send("Unauthorized")
        }
        req.user = decoded;
        next();
    })
}

router.get("/:id",getRoomById)
router.patch("/:id",voteById)
router.post("/",verifyToken,createRooms)

export default router;