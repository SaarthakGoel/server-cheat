import mongoose from "mongoose";


const roomSchema = new mongoose.Schema({
  roomId : Number,
  users : [{
    name : String,
    socketId : String,
    host : Boolean
  }],
  playerNo : Number,
  decks : Number,
})

const Room =  mongoose.model('Room' , roomSchema);

export default Room;