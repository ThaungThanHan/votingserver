import { mongoose } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import * as dotenv from 'dotenv'
dotenv.config()

const usersSchema = new mongoose.Schema({
    _id:String,
    username:String,
    email:String,
    password:String
},{collection:"users"},{versionKey:false})
const usersModel = mongoose.model("Users",usersSchema);

export const SignUpUser = async(req,res,err) => {
    try{
        const existingUser = await usersModel.exists({username:req.body.username});
        const existingEmail = await usersModel.exists({email:req.body.email});
        if(existingUser){
            res.status(400).json({error:`User with username ${req.body.username} exists.`});
        }else if(existingEmail){
            res.status(400).json({error:`User with email ${req.body.email} exists.`})
        }else{
            const user = new usersModel({
                _id:req.body.userId,
                username:req.body.username,
                password:bcrypt.hashSync(req.body.password,8),
                email:req.body.email
            })
            user.save();
            res.status(200).send(`User with username ${req.body.username} has been created!`)
        }
    }catch(err){
        res.send(err.message)
    }
}

export const LoginUser = async(req,res) => {
    try{
        const User = await usersModel.findOne({"username":req.body.username});
        if(!User){
            res.status(404).send({error:`User with username "${req.body.username}" not found!`})
        }else{
            const passwordMatching = bcrypt.compareSync(req.body.password,User.password);
            if(!passwordMatching){
                res.status(401).send({
                    accessToken:null,
                    error:"Invalid password"
                })
            }else{
                const token = jwt.sign({id:User._id},process.env.SECRET_KEY,{
                    expiresIn:86400
                })
                res.status(200).send({
                    userId:User._id,
                    authToken:token
                })
            }
        }
    }catch(err){
        console.log(err)
    }
}

export const getUser = async(req,res) => {
    try{
        const userId = req.params.id
        const User = await usersModel.findOne({_id:userId})
        res.send(User)
    }catch(err){
        console.log(err)
    }
}