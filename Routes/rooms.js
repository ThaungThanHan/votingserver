import {mongoose,Schema} from "mongoose";
import express from "express";
import { createRooms, getRoomById, getRoomsByHost, voteById, deleteRoomById, uploadPicture } from "../Controllers/roomsController.js";
const router = express.Router();
import jwt from "jsonwebtoken";
import multer from "multer";
const upload = multer({ dest: 'uploads/'});
import * as dotenv from 'dotenv'
dotenv.config()

const verifyToken = (req,res,next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){
        res.send(401).send('Unauthorized via verifyToken')
    }else{
        jwt.verify(token,process.env.SECRET_KEY,(err,decoded)=>{
            if(err){
                res.status(401).send("Unauthorized via verifiedToken")
            }else{
                req.user = decoded;
                next();
            }
        })
    }

}

router.get("/:id",getRoomById)
router.patch("/:id",voteById)
router.post("/host",verifyToken,getRoomsByHost)
router.post("/",upload.any('files'),createRooms)
router.post("/uploadpicture",uploadPicture);
router.post("/delete/:id",deleteRoomById);


process.on('SIGINT', function () {
    upload.cleanup();
    process.exit();
  });
  
export default router;