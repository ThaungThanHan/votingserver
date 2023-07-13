import {mongoose} from "mongoose";
import AWS from "aws-sdk";
import * as dotenv from 'dotenv'
dotenv.config()
import fs from "fs"
import QRCode from "qrcode";
import nodemailer from "nodemailer";

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port : 465,
    auth: {
      user: "hanvotingapp@gmail.com", // generated ethereal user
      pass: "bixgqgxvahaltfzx", // generated ethereal password
    },
  });

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
    winner:Object,
    votersList:Array
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
                votersList:[]
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
export const voteById = async (req, res) => {
    try {
      const roomId = req.params.id;
      const roomById = await roomsModel.findById(roomId);
      const optionId = req.body.id;
      const currentVotes = req.body.votes;
      const numOfVoters = req.body.num_voters;
      const voterToken = req.body.token;
  
      for (const voter of roomById.votersList) {
        if (voterToken === voter.token) {
          const tokenData = roomById.votersList.filter(voter=>voter.token == voterToken);
          if(tokenData[0].voteStatus == false){
            const voterData = await roomsModel.findOneAndUpdate(
            { "_id": roomId, "votersList.token": voterToken },
            { $set: { "votersList.$[element].voteStatus": true } },
            { arrayFilters: [{ "element.token": voterToken }] }
          );
            await voterData.save();
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
                   const increaseNumVoters = await roomsModel.findByIdAndUpdate(roomId,{num_voters:numOfVoters+1})
                   votedOptionData.save();
                   increaseNumVoters.save();
            res.status(200).send(`voted for ${optionId}`);    
            return;
          }else{
            console.log("ALREADY VOTED!")
            res.status(500).send("Voter already voted once!");
          }
        
          return; // Exit the function after sending the response
        }
      }
  
      // Voter not found
      res.status(404).send("Voter not found");
    } catch (error) {
      console.error("Error voting:", error);
      res.status(500).send("Error voting");
    }
  };
export const getRoomsByHost = async(req,res) => {
    try{
        const Rooms = await roomsModel.find({host:req.body.userId})
        res.send(Rooms)
    }catch(err){
        console.log(err)
    }
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}
export const createEmailTokens = async(req,res) => {
    try{
        const roomId = req.body.id;
        const emailArray = req.body.emailList;
        const roomById = await roomsModel.findById(roomId);    
        const votersAddress = [];
        if(roomById.voters_limit > roomById.votersList.length){
            const votersDiff = roomById.voters_limit - roomById.votersList.length;
            const ArrayGreaterDiff = (diff,arrayLength) => {
                return (diff - (diff - arrayLength)) - (arrayLength - diff);
            }
            const ArrayLessDiff = (diff,arrayLength) => {
                return (diff - (diff - arrayLength));
            }
            if(emailArray.length > votersDiff){
                for(let i = 0; i < ArrayGreaterDiff(votersDiff,emailArray.length);i++){
                    votersAddress.push({email:emailArray[i],token:getRandomInt(999999,1000000)})
                }
            }else{
                for(let i = 0; i < ArrayLessDiff(votersDiff,emailArray.length);i++){
                    votersAddress.push({email:emailArray[i],token:getRandomInt(999999,1000000)})
                }
            }

            votersAddress.map(async voter=>{
                const votersList = await roomsModel.findByIdAndUpdate(roomId,{$push:{votersList:{
                    email:voter.email,token:voter.token,voteStatus:false
                }}});
                votersList.save();
            })
            votersAddress.map((add)=>{
                sendEmailVoters(add.email,add.token,roomById.roomName,roomById._id);
            })
            res.send("Voters created and sent emails accordingly.")
        }else{
            res.status(500).json({error:`Voters limit exceeded`})
    }}catch(err){
        console.log(err)
    }
}

const sendEmailVoters = async(email,token,roomName,roomId) => {
    await transporter.sendMail({
        from: 'hanvotingapp@gmail.com', // sender address
        to: email, // list of receivers
        subject: "You have been invited to cast a vote!", // Subject line
        text: "Greetings! You have been invited to make a vote. Please enter your token before voting.", // plain text body
        html: `
        <p>Greetings! You have been invited to make a vote at "${roomName}".</p>
        <p>Please view more info via this link: <a href="https://hanvotingapp.vercel.app/rooms/${roomId}">Click here</a>
        </p>

        <b>Please use this access code to bypass security:${token}</b>
        `
        , // html body
    })
}

// Remove Voter from Voting list
export const removeVoterFromList = async(req,res) => {
    try{
        const roomId = req.body.id;
        const voterEmail = req.body.email;
        const roomById = await roomsModel.findById(roomId);    
        roomById.votersList.map(voter=>{
            if(voter.email == voterEmail){
                if(voter.voteStatus == false){
                    roomsModel.findOneAndUpdate(
                        {_id:roomId},
                        {$pull:{votersList:{email:voterEmail}}},
                        {new:true}
                    ).then(updatedVoters=>res.status(200).send("Voter removed")).catch(err=>console.log(err));
                }else{
                    res.status(500).send("Voter already voted!")
                }
            }else{
                res.status(500).send("Voter not found!")
            }
        })
    }catch(err){
        console.error(err);
    }
}

// VerifyAccessCode
export const verifyAccessCode = async(req,res) => {
    try{
        const roomId = req.body.id;
        const accessCode = req.body.accessCode;
        const roomById = await roomsModel.findById(roomId);    
        if(roomById.votersList.length > 0){
            roomById.votersList.forEach(voter=>{
            if(voter.token == accessCode){
                res.send(voter);
            }
        })
        res.status(401).json({error:`Acess code ${accessCode} is invalid`});
        }else{
            res.status(500).json({error:`No invited voters in this room`})
        }
    }catch(err){
        console.log(err)
    }
}