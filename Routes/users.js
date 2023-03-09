import express from "express";
const router = express.Router();
import { SignUpUser } from "../Controllers/usersController.js";

router.post(`/signup`,SignUpUser);

export default router;