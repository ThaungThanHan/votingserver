import express from "express";
import {mongoose} from "mongoose";
import bodyParser from 'body-parser';
import cors from "cors";
import roomsRoutes from "./Routes/rooms.js"
import usersRoutes from "./Routes/users.js"
import * as dotenv from 'dotenv'
dotenv.config()

const App = express();
const PORT = process.env.PORT;
App.use(bodyParser.json());
App.use(cors({
    origin:'https://hanvotingapp.vercel.app',
    optionsSuccessStatus: 200,
    allowedHeaders:'Content-Type, Authorization',
}));

const uri = process.env.MONGODB_URI;
const connectDB = async() => {
    try{
        await mongoose.connect(`${uri}`,{dbName:`${process.env.MONGODB_DBNAME}`});
        console.log("DB Successfully connected!")
    }catch(err){
        console.error(err);
        process.exit(1);
    }
}


App.use("/rooms",roomsRoutes)
App.use("/",usersRoutes)

App.listen(PORT);
connectDB();