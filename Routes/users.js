import express from "express";
const router = express.Router();
import { SignUpUser,LoginUser, getUser } from "../Controllers/usersController.js";
import * as dotenv from 'dotenv'
dotenv.config()


router.post(`/signup`,SignUpUser);
router.post(`/login`,LoginUser);
router.post(`/users/:id`,getUser);

export default router;