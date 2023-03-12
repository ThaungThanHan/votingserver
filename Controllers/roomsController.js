import {mongoose} from "mongoose";

const roomsSchema = new mongoose.Schema({
    _id:String,
    roomName:String,
    roomDesc:String,
    host:String,
    endDateTime:Date,
    num_voters:Number,
    voters_limit:Number,
    num_participants:Number,
    participants:Array,
    winner:Object
},{collection:"voting_rooms"},{versionKey:false})
const roomsModel = mongoose.model("Rooms",roomsSchema)

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

export const createRooms = async(req,res) => {
    try{
        const {_id,roomName,roomDesc,endDateTime,num_participants,num_voters,winner,participants,voters_limit,currentUserId} = req.body;
        const roomData = new roomsModel({
            _id:_id,
            roomName:roomName,
            roomDesc:roomDesc,
            host:currentUserId,
            endDateTime:endDateTime,
            num_voters:num_voters,
            voters_limit:voters_limit,
            num_participants:num_participants,
            participants:participants,
            winner:winner,
        })
        await roomData.save();
        res.send(`Voting room with ID ${_id} is successfully created!`)
    }catch(err){
        console.error(err)
    }
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