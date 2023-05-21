import express from "express";
const router = express.Router();
import { SignUpUser,LoginUser, getUser,verifyUser } from "../Controllers/usersController.js";
import * as dotenv from 'dotenv'
dotenv.config()

router.get(`/verifyUser`,verifyUser)
router.post(`/signup`,SignUpUser);
router.post(`/login`,LoginUser);
router.post(`/users/:id`,getUser);

export default router;