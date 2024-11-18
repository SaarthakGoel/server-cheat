import mongoose from "mongoose";


const gameDataSchema = new mongoose.Schema({
  players : [{
    playerName : String,
    cardQuantity : Number,
    cards : [String],
    socketId : String 
  }],

  turn : String,
  prev : String,
  skip : [Boolean],
  won : [Number],
  currentFace : String,

  cardsInMiddle : [String],
  cardsInLastChance : [String]

})

const GameData = mongoose.model('GameData' , gameDataSchema);

export default GameData;