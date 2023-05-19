import {mongoose} from "mongoose";
import AWS from "aws-sdk";
import * as dotenv from 'dotenv'
dotenv.config()
import fs from "fs"
import QRCode from "qrcode";

const roomsSchema = new mongoose.Schema({
    _id:String,
    roomName:String,
    roomDesc:String,
    roomQR:String,
    host:String,
    endDateTime:Date,
    num_voters:Number,
    voters_limit:Number,
    num_participants:Number,
    participants:Array,
    winner:Object
},{collection:"voting_rooms"},{versionKey:false})
const roomsModel = mongoose.model("Rooms",roomsSchema)

const s3 = new AWS.S3({
    accessKeyId:process.env.ACCESS_KEY_S3,
    secretAccessKey:process.env.SECRET_ACCESS_KEY_S3,
    region:process.env.AWS_REGION
})

const uploadImage = async (file,roomId,participantName,index,participants) => {
    console.log(file)
    if(file.mimetype == "image/jpeg"){
        var fileType = "jpg"
    }else if(file.mimetype == "image/png"){
        var fileType = "png"
    }
    // const base64File = file.toString("base64")
    const imageBuffer = fs.readFileSync(file.path)
    const uploadParams = {
        Bucket:process.env.BUCKET_NAME,
        Key:`images/${roomId}-${participantName}.${fileType}`,
        Body:imageBuffer,
        ContentType:file.mimetype,
    }
    return new Promise((resolve, reject) => {
        s3.upload(uploadParams, (err, data) => {
          if (err) {
            console.log("Error uploading file ", err);
            reject(err);
          }else{
            participants[index].avatar = data.Location;
            resolve(participants);
          }
        });
      });
}

export const getRoomById = async(req,res) => {
    try{
        const currentDate = Date.now()
        const {id} = req.params;
        const roomById = await roomsModel.findById(id);    
        if(roomById && roomById.endDateTime < currentDate){
            if(roomById.winner == ""){
                var votesArray = [];
                roomById.participants.map(partici=>{
                    votesArray.push(partici.votes)
                });
                var largest = votesArray[0]
                for(let i = 0; i < votesArray.length ; i++){
                    if(largest < votesArray[i]){
                        largest = votesArray[i]
                    }
                }
                const largestIndex = votesArray.indexOf(largest);
                console.log(roomById.participants[largestIndex])
                const winnerData = await roomsModel.findByIdAndUpdate(id,{winner:roomById.participants[largestIndex]})
                winnerData.save();
            }
        }else{
            return res.send(roomById)
        }
        res.send(roomById)
    }catch(error){
        console.error(error)
    }
}

export const deleteRoomById = async(req,res) => {
    try{
        const deletedRoom = await roomsModel.deleteOne({_id:req.params.id})
        res.send(`Room with ID ${req.params.id} has been deleted.`)
    }catch(err){
        res.send(err)
    }
}
export const createRooms = async(req,res) => {
    try{
        const {_id,roomName,roomQR,roomDesc,endDateTime,num_participants,num_voters,winner,voters_limit,currentUserId} = req.body;
        const parsedParticipants = JSON.parse(req.body.participants);
        if(req.files.length > 0){
            const promises = req.files.map((image, index) => {
                return uploadImage(image, _id, parsedParticipants[index].name, index, parsedParticipants);
              });
            const updatedParticipants = await Promise.all(promises);
            updatedParticipants.splice(1,1);
            const roomData = new roomsModel({
                _id:_id,
                roomName:roomName,
                roomDesc:roomDesc,
                roomQR:roomQR,
                host:currentUserId,
                endDateTime:endDateTime,
                num_voters:num_voters,
                voters_limit:voters_limit,
                num_participants:num_participants,
                participants:updatedParticipants[0],
                winner:winner,
            })
            await roomData.save();
            res.send(`Voting room with ID ${_id} is successfully created!`)
        }else{
            const roomData = new roomsModel({
                _id:_id,
                roomName:roomName,
                roomDesc:roomDesc,
                roomQR:roomQR,
                host:currentUserId,
                endDateTime:endDateTime,
                num_voters:num_voters,
                voters_limit:voters_limit,
                num_participants:num_participants,
                participants:parsedParticipants,
                winner:winner,
            })
            await roomData.save();
            res.send(`Voting room with ID ${_id} is successfully created!`)
            res.send(parsedParticipants);
        }


    }catch(err){
        console.error(err)
    }
}

export const uploadPicture = async(req,res) => {
    res.send(req.files)
}
export const voteById = async (req,res) => {
    try{
        const roomId = req.params.id;
        const optionId = req.body.id;
        const currentVotes = req.body.votes;
        const numOfvoters = req.body.num_voters;
        const votedOptionData = await roomsModel.findOneAndUpdate(
            {"_id":roomId,"participants.id":optionId},
            {
                $set:{
                    "participants.$[element].votes":currentVotes+1
                }
            },{
                "arrayFilters":[
                    {
                        "element.id":req.body.id
                    }
                ]
            }
        )
        const increaseNumVoters = await roomsModel.findByIdAndUpdate(roomId,{num_voters:numOfvoters+1})
        votedOptionData.save();
        increaseNumVoters.save();
        res.send(`voted for ${optionId}`)
    }catch{

    }
}

export const getRoomsByHost = async(req,res) => {
    try{
        const Rooms = await roomsModel.find({host:req.body.userId})
        res.send(Rooms)
    }catch(err){
        console.log(err)
    }
}