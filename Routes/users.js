import express from "express";
const router = express.Router();
import { SignUpUser,LoginUser } from "../Controllers/usersController.js";

router.post(`/signup`,SignUpUser);
router.post(`/login`,LoginUser);

export default router;