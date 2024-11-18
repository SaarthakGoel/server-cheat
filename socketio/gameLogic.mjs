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
  })

}