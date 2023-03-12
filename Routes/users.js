import express from "express";
const router = express.Router();
import { SignUpUser,LoginUser } from "../Controllers/usersController.js";
import * as dotenv from 'dotenv'
dotenv.config()


router.post(`/signup`,SignUpUser);
router.post(`/login`,LoginUser);

export default router;