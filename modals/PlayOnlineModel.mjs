import mongoose from "mongoose";


const playOnlineSchema = new mongoose.Schema({
  roomId : Number,
  users : [{
    name : String,
    socketId : String,
    host : Boolean
  }],
  playerNo : Number,
  decks : Number,
  full : Boolean
})

const OnlineRoom =  mongoose.model('OnlineRoom' , playOnlineSchema);

export default OnlineRoom;