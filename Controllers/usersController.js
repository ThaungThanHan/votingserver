import { mongoose } from "mongoose";
import bcrypt from "bcrypt"
const usersSchema = new mongoose.Schema({
    _id:String,
    username:String,
    email:String,
    password:String
},{collection:"users"},{versionKey:false})
const usersModel = mongoose.model("Users",usersSchema);

export const SignUpUser = async(req,res) => {
    try{
        const existingUser = await usersModel.exists({username:req.body.username});
        const existingEmail = await usersModel.exists({email:req.body.email});
        if(existingUser){
            res.status(500).send(`User with username ${req.body.username} exists.`)
        }
        if(existingEmail){
            res.status(500).send(`User with email ${req.body.email} exists.`)
        }
        const user = new usersModel({
            _id:req.body.userId,
            username:req.body.username,
            password:bcrypt.hashSync(req.body.password,8),
            email:req.body.email
        })
        user.save();
        res.send(`User with username ${req.body.username} has been created!`)
    }catch(err){
        console.error(err)
    }
}