import GameData from "../modals/GameDataModel.mjs";
import Room from "../modals/RoomModel.mjs";
import { findFaceName } from "../utils/findFaceName.mjs";


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

      return selectedCards.sort((a , b) => a.localeCompare(b));
    }

    const players = foundRoom.users.map((user, index) => {
      if (index === 0) {
        return {
          playerName: user.name,
          cardQuantity: myCards,
          cards: selectRandomCards(allCards, myCards),
          socketId: user.socketId
        }
      } else {
        return {
          playerName: user.name,
          cardQuantity: cardQuantity,
          cards: selectRandomCards(allCards, cardQuantity),
          socketId: user.socketId
        }
      }
    })

    const skip = players.map(() => 0)

    const gameData = new GameData({
      players: players,
      roomId: currRoom,
      turn: socket.id,
      prev: null,
      skip: skip,
      won: skip,
      currentFace: null,
      cardsInMiddle: null,
      cardsInLastChance: null
    })

    const result = await gameData.save();

    const mainMessage = "Game Started 😊"

    io.to(currRoom).emit('gameStarted', { players, turn: socket.id, skip , mainMessage : mainMessage})
  });









  socket.on('FaceChancePlayed', async ({ currSocketId, currRoom, selectedCards, currFace }) => {
    console.log(currSocketId, currRoom, selectedCards, currFace)

    const foundGameData = await GameData.findOne({ roomId: currRoom });

    if (!foundGameData) {
      console.log(`game not started in ${currRoom}`);
      return;
    }

    foundGameData.players.forEach((player) => {
      if (player.socketId === currSocketId) {
        player.cardQuantity = player.cardQuantity - selectedCards.length;
        player.cards = player.cards.filter((card) => !selectedCards.includes(card));
      }
    });

    foundGameData.cardsInLastChance = selectedCards;
    if (foundGameData.cardsInMiddle === null) {
      foundGameData.cardsInMiddle = selectedCards;
    } else {
      foundGameData.cardsInMiddle = [...foundGameData.cardsInMiddle, ...selectedCards];
    }
    foundGameData.prev = currSocketId;
    foundGameData.currentFace = currFace;

    const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);
    if (currentPlayerIndex === -1) {
      console.log(`Current player not found in players array`);
      return;
    }

    let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;

    foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

    const res = await foundGameData.save();

    //message logic
    const mainMessage = `${foundGameData.players[currentPlayerIndex].playerName} threw ${selectedCards.length} ${findFaceName(currFace)}`;

    io.to(currRoom).emit('FaceChanceDone', {
      players: foundGameData.players,
      turn: foundGameData.turn,
      cardsInMiddle: foundGameData.cardsInMiddle,
      cardsInLastChance: foundGameData.cardsInLastChance,
      prev: foundGameData.prev,
      currentFace: currFace,
      mainMessage : mainMessage
    })
  })







  socket.on('throwChance', async ({ currSocketId, currRoom, selectedCards }) => {
    console.log(currSocketId, currRoom, selectedCards);

    const foundGameData = await GameData.findOne({ roomId: currRoom });

    if (!foundGameData) {
      console.log(`game not started in ${currRoom}`);
      return;
    }

    foundGameData.players.forEach((player) => {
      if (player.socketId === currSocketId) {
        player.cardQuantity = player.cardQuantity - selectedCards.length;
        player.cards = player.cards.filter((card) => !selectedCards.includes(card));
      }
    });

    foundGameData.cardsInLastChance = selectedCards;
    if (foundGameData.cardsInMiddle === null) {
      foundGameData.cardsInMiddle = selectedCards;
    } else {
      foundGameData.cardsInMiddle = [...foundGameData.cardsInMiddle, ...selectedCards];
    }

    const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);
    if (currentPlayerIndex === -1) {
      console.log(`Current player not found in players array`);
      return;
    }

    const prevPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === foundGameData.prev)

    foundGameData.prev = currSocketId;

    let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;

    while (foundGameData.won[nextPlayerIndex]) {
      nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
      if(nextPlayerIndex === currentPlayerIndex){
        console.log('we have a loser 1')
        return ;
      }
    }

    foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

    const res = await foundGameData.save();

    //message logic
    const mainMessage = `${foundGameData.players[currentPlayerIndex].playerName} threw ${selectedCards.length} ${findFaceName(foundGameData.currentFace)}`;

    io.to(currRoom).emit('throwChanceDone', {
      players: foundGameData.players,
      turn: foundGameData.turn,
      cardsInMiddle: foundGameData.cardsInMiddle,
      cardsInLastChance: foundGameData.cardsInLastChance,
      prev: foundGameData.prev,
      won: foundGameData.won,
      mainMessage : mainMessage
    })

  })








  socket.on('skipChance', async ({ currSocketId, currRoom }) => {
    console.log(currSocketId, currRoom);

    const foundGameData = await GameData.findOne({ roomId: currRoom });

    if (!foundGameData) {
      console.log(`game not started in ${currRoom}`);
      return;
    }

    const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);
    foundGameData.skip[currentPlayerIndex] = 1;

    if (Math.min(...foundGameData.skip) === 1) {
      let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;
      while (foundGameData.won[nextPlayerIndex]) {
        nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
        if(nextPlayerIndex === currentPlayerIndex){
          console.log('we have a loser 2')
          return ;
        }
      }
      foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;
      foundGameData.prev = null;
      foundGameData.skip = foundGameData.won.map((x) => x>=1);
      foundGameData.currentFace = null;
      foundGameData.cardsInMiddle = [];
      foundGameData.cardsInLastChance = [];
      const res = await foundGameData.save();
      io.to(currRoom).emit('roundOver', {
        turn: foundGameData.turn,
        prev: foundGameData.prev,
        skip: foundGameData.skip,
        currentFace: foundGameData.currentFace,
        cardsInMiddle: foundGameData.cardsInMiddle,
        cardsInLastChance: foundGameData.cardsInLastChance
      });
    } else {
      let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;
  
      while (foundGameData.won[nextPlayerIndex]) {
        nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
        if(nextPlayerIndex === currentPlayerIndex){
          console.log('we have a loser 3')
          return ;
        }
      }
      foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

      const res = await foundGameData.save();

      const mainMessage = `${foundGameData.players[currentPlayerIndex].playerName} has skipped`;

      io.to(currRoom).emit('chanceSkipped', { turn: foundGameData.turn , skip : foundGameData.skip , mainMessage : mainMessage });
    }

  })







  socket.on('doubtChance' , async({currRoom}) => {
    console.log( "doubtemitted" , currRoom);
    const foundGameData = await GameData.findOne({roomId : currRoom});
    const currentPlayer = foundGameData.players.find((player) => player.socketId === foundGameData.turn);
    const prevPlayer = foundGameData.players.find((player) => player.socketId === foundGameData.prev);
    const mainMessage = `${currentPlayer.playerName} has doubted ${prevPlayer.playerName}`;
    io.to(currRoom).emit('doubleChosen' , {mainMessage});
   })


   socket.on('cardFlipped' , ({currRoom , item}) => {
     io.to(currRoom).emit('cardFlipComplete' , {item});
   })


   

socket.on('handleDoubtLogic', async ({ openCard, currRoom, currSocketId }) => {
  const foundGameData = await GameData.findOne({ roomId: currRoom });

  const prevPlayer = foundGameData.players.find((player => player.socketId === foundGameData.prev));

  if (foundGameData.currentFace === openCard[0]) {
    const currentPlayerIndex = foundGameData.players.findIndex(
      (player) => player.socketId === currSocketId
    );
    const newQuantity =
      foundGameData.players[currentPlayerIndex].cardQuantity +
      foundGameData.cardsInMiddle.length;
    const newCards = [
      ...foundGameData.players[currentPlayerIndex].cards,
      ...foundGameData.cardsInMiddle,
    ];
    newCards.sort((a , b) => a.localeCompare(b));

    let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;
    while (foundGameData.won[nextPlayerIndex]) {
      nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
      if (nextPlayerIndex === currentPlayerIndex) {
        console.log('We have a loser 4'); 
        return;
      }
    }
    const newTurn = foundGameData.players[nextPlayerIndex].socketId;
    const newWon = foundGameData.players.map((player) => {
      if(player.cardQuantity === 0){
        return 1;
      }else{
        return 0;
      }
    })
    const newSkip = foundGameData.won.map((x) => x===1);

    const res = await GameData.findOneAndUpdate(
      { roomId: currRoom },
      {
        $set: {
          "players.$[currentPlayer].cardQuantity": newQuantity,
          "players.$[currentPlayer].cards": newCards,
          turn: newTurn,
          prev: null,
          skip: newSkip,
          won : newWon,
          currentFace: null,
          cardsInMiddle: [],
          cardsInLastChance: [],
        },
      },
      {
        arrayFilters: [{ "currentPlayer.socketId": currSocketId }],
        new: true,
      }
    );

    const mainMessage = `Wrong Call ! , ${prevPlayer.playerName} was truthful `;

    io.to(currRoom).emit('doubtLogicDone', {
      players: res.players,
      turn: res.turn,
      prev: res.prev,
      skip: res.skip,
      won : res.won,
      currentFace: res.currentFace,
      cardsInMiddle: res.cardsInMiddle,
      cardsInLastChance: res.cardsInLastChance,
      mainMessage : mainMessage
    });
  } else {
    const prevPlayerIndex = foundGameData.players.findIndex(
      (player) => player.socketId === foundGameData.prev
    );

    console.log(prevPlayerIndex , foundGameData.players[prevPlayerIndex]);

    const newQuantity =
      foundGameData.players[prevPlayerIndex]?.cardQuantity +
      foundGameData.cardsInMiddle.length;
    const newCards = [
      ...foundGameData.players[prevPlayerIndex].cards,
      ...foundGameData.cardsInMiddle,
    ];
    newCards.sort((a , b) => a.localeCompare(b));

    const newWon = foundGameData.players.map((player) => {
      if(player.cardQuantity === 0){
        return 1;
      }else{
        return 0;
      }
    })
    const newSkip = foundGameData.won.map((x) => x===1);

    const res = await GameData.findOneAndUpdate( 
      { roomId: currRoom },
      {
        $set: {
          "players.$[prevPlayer].cardQuantity": newQuantity,
          "players.$[prevPlayer].cards": newCards,
          turn: currSocketId,
          prev: null,
          skip: newSkip,
          won : newWon,
          currentFace: null,
          cardsInMiddle: [],
          cardsInLastChance: [],
        },
      },
      {
        arrayFilters: [{ "prevPlayer.socketId": foundGameData.prev }],
        new: true,
      }
    );
    const mainMessage = `Good Call ! , ${prevPlayer.playerName} was lying`;

    io.to(currRoom).emit('doubtLogicDone', {
      players: res.players,
      turn: res.turn,
      prev: res.prev,
      skip: res.skip,
      won : res.won,
      currentFace: res.currentFace,
      cardsInMiddle: res.cardsInMiddle, 
      cardsInLastChance: res.cardsInLastChance,
      mainMessage : mainMessage
    });
  }
});






socket.on('iwon' , async({currSocketId  , currRoom}) => {

   const foundGameData = await GameData.findOne({roomId : currRoom});
 
   const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);

   foundGameData.skip[currentPlayerIndex] = 1;
   const maxWonValue = Math.max(...foundGameData.won.map((val) => Number(val) || 0));
   foundGameData.won[currentPlayerIndex] = maxWonValue + 1;


   let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;
      while (foundGameData.won[nextPlayerIndex]) {
        nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
        if(nextPlayerIndex === currentPlayerIndex){
          console.log('we have a loser 2')
          return ;
        }
      }
      foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;
      foundGameData.prev = null;
      foundGameData.skip = foundGameData.won.map((x) => x>=1);
      foundGameData.currentFace = null;
      foundGameData.cardsInMiddle = [];
      foundGameData.cardsInLastChance = [];
      const res = await foundGameData.save();
      io.to(currRoom).emit('roundOver', {
        turn: foundGameData.turn,
        prev: foundGameData.prev,
        skip: foundGameData.skip,
        currentFace: foundGameData.currentFace,
        cardsInMiddle: foundGameData.cardsInMiddle,
        cardsInLastChance: foundGameData.cardsInLastChance
      });
})


}