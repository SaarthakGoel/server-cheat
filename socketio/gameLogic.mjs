import GameData from "../modals/GameDataModel.mjs";
import Room from "../modals/RoomModel.mjs";


export default function gameLogic(socket, io) {

  socket.on('startGame', async ({ currSocketId, currRoom }) => {
    console.log('game started', currRoom, currSocketId);

    const foundRoom = await Room.findOne({ roomId: currRoom });
    if (!foundRoom) {
      console.log(`room ${currRoom} not found`);
      return;
    }

    const { playerNo, decks } = foundRoom;
    const cardQuantity = Math.floor(((52 * decks) / playerNo));
    const myCards = Math.ceil(((52 * decks) / playerNo));

    function getAllCards(noOfDecks) {
      const suits = ["S", "H", "D", "C"]; // Spades, Hearts, Diamonds, Clubs
      const ranks = [
        "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"
      ]; // Card ranks
      const cards = [];
    
      for (let deck = 1; deck <= noOfDecks; deck++) {
        for (const suit of suits) {
          for (const rank of ranks) {
            cards.push(`${rank}${suit}${deck}`);
          }
        }
      }
    
      return cards;
    }

    const allCards = getAllCards(decks);

    function selectRandomCards(allCards, numberOfCards) {
      if (numberOfCards > allCards.length) {
        throw new Error("Not enough cards in the deck to draw the requested number.");
      }
    
      const selectedCards = [];
      for (let i = 0; i < numberOfCards; i++) {
        const randomIndex = Math.floor(Math.random() * allCards.length);
        selectedCards.push(allCards[randomIndex]);
        allCards.splice(randomIndex, 1); // Remove the selected card from the array
      }
    
      return selectedCards;
    }

    const players = foundRoom.users.map((user, index) => {
      if (index === 0) {
        return {
          playerName: user.name,
          cardQuantity: myCards,
          cards : selectRandomCards(allCards , myCards),
          socketId: user.socketId
        }
      } else {
        return {
          playerName: user.name,
          cardQuantity: cardQuantity,
          cards : selectRandomCards(allCards , cardQuantity),
          socketId: user.socketId
        }
      }
    })

    const skip = players.map(() => 0)

    const gameData = new GameData({
      players: players,
      roomId : currRoom,
      turn: socket.id,
      prev: null,
      skip: skip,
      won: skip,
      currentFace: null,
      cardsInMiddle: null,
      cardsInLastChance: null
    })

    const result = await gameData.save();

    io.to(currRoom).emit('gameStarted', { players, turn: socket.id, skip })
  });




  socket.on('FaceChancePlayed' , async ({currSocketId , currRoom , selectedCards , currFace}) => {
    console.log(currSocketId , currRoom , selectedCards , currFace)

    const foundGameData = await GameData.findOne({roomId : currRoom});

    if(!foundGameData) {
      console.log(`game not started in ${currRoom}`);
      return;
    }

    foundGameData.players.forEach((player) => {
      if(player.socketId === currSocketId){
        player.cardQuantity = player.cardQuantity - selectedCards.length;
        player.cards = player.cards.filter((card) => !selectedCards.includes(card) );
      }
    });

    foundGameData.cardsInLastChance = selectedCards;
    if(foundGameData.cardsInMiddle === null){
      foundGameData.cardsInMiddle = selectedCards;
    }else{
      foundGameData.cardsInMiddle = [...foundGameData.cardsInMiddle , ...selectedCards];
    }
    foundGameData.prev = currSocketId;
    foundGameData.currentFace = currFace;

    const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);
    if(currentPlayerIndex === -1){
      console.log(`Current player not found in players array`);
      return;
    }

    let nextPlayerIndex = (currentPlayerIndex + 1)% foundGameData.players.length;

    foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

    const res = await foundGameData.save();

    io.to(currRoom).emit('FaceChanceDone' , {
      players : foundGameData.players,
      turn : foundGameData.turn,
      cardsInMiddle : foundGameData.cardsInMiddle,
      cardsInLastChance : foundGameData.cardsInLastChance,
      prev : foundGameData.prev,
      currentFace : currFace
    })
  })





}