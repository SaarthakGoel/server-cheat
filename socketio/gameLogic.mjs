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

    io.to(currRoom).emit('gameStarted', { players, turn: socket.id, skip })
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

    io.to(currRoom).emit('FaceChanceDone', {
      players: foundGameData.players,
      turn: foundGameData.turn,
      cardsInMiddle: foundGameData.cardsInMiddle,
      cardsInLastChance: foundGameData.cardsInLastChance,
      prev: foundGameData.prev,
      currentFace: currFace
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
    foundGameData.prev = currSocketId;

    const currentPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === currSocketId);
    if (currentPlayerIndex === -1) {
      console.log(`Current player not found in players array`);
      return;
    }

    const prevPlayerIndex = foundGameData.players.findIndex((player) => player.socketId === foundGameData.prev)
    if (foundGameData.players[prevPlayerIndex].cardQuantity === 0) {
      const nextPosition = Math.max(...foundGameData.won) + 1;
      foundGameData.won[prevPlayerIndex] = nextPosition;
    }

    let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;

    while (foundGameData.skip[nextPlayerIndex]) {
      nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
    }

    while (foundGameData.won[nextPlayerIndex]) {
      nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
      if(nextPlayerIndex === currentPlayerIndex){
        console.log('we have a loser')
        return ;
      }
    }

    foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

    const res = await foundGameData.save();

    io.to(currRoom).emit('throwChanceDone', {
      players: foundGameData.players,
      turn: foundGameData.turn,
      cardsInMiddle: foundGameData.cardsInMiddle,
      cardsInLastChance: foundGameData.cardsInLastChance,
      prev: foundGameData.prev,
      won: foundGameData.won
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
          console.log('we have a loser')
          return ;
        }
      }
      foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;
      foundGameData.prev = null;
      foundGameData.skip = foundGameData.players.map(() => 0);
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
      while (foundGameData.skip[nextPlayerIndex]) {
        nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
      }
  
      while (foundGameData.won[nextPlayerIndex]) {
        nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
        if(nextPlayerIndex === currentPlayerIndex){
          console.log('we have a loser')
          return ;
        }
      }
      foundGameData.turn = foundGameData.players[nextPlayerIndex].socketId;

      const res = await foundGameData.save();

      io.to(currRoom).emit('chanceSkipped', { turn: foundGameData.turn , skip : foundGameData.skip });
    }

  })


  socket.on('doubtChance' , ({currRoom}) => {
    console.log( "doubtemitted" , currRoom)
    io.to(currRoom).emit('doubleChosen');
   })


   socket.on('cardFlipped' , ({currRoom , item}) => {
     io.to(currRoom).emit('cardFlipComplete' , {item});
   })


   

socket.on('handleDoubtLogic', async ({ openCard, currRoom, currSocketId }) => {
  const foundGameData = await GameData.findOne({ roomId: currRoom });

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

    let nextPlayerIndex = (currentPlayerIndex + 1) % foundGameData.players.length;
    while (foundGameData.won[nextPlayerIndex]) {
      nextPlayerIndex = (nextPlayerIndex + 1) % foundGameData.players.length;
      if (nextPlayerIndex === currentPlayerIndex) {
        console.log('We have a loser'); 
        return;
      }
    }
    const newTurn = foundGameData.players[nextPlayerIndex].socketId;
    const newSkip = foundGameData.players.map(() => 0);

    const res = await GameData.findOneAndUpdate(
      { roomId: currRoom },
      {
        $set: {
          "players.$[currentPlayer].cardQuantity": newQuantity,
          "players.$[currentPlayer].cards": newCards,
          turn: newTurn,
          prev: null,
          skip: newSkip,
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

    io.to(currRoom).emit('doubtLogicDone', {
      players: res.players,
      turn: res.turn,
      prev: res.prev,
      skip: res.skip,
      currentFace: res.currentFace,
      cardsInMiddle: res.cardsInMiddle,
      cardsInLastChance: res.cardsInLastChance,
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

    const newSkip = foundGameData.players.map(() => 0);

    const res = await GameData.findOneAndUpdate( 
      { roomId: currRoom },
      {
        $set: {
          "players.$[prevPlayer].cardQuantity": newQuantity,
          "players.$[prevPlayer].cards": newCards,
          turn: currSocketId,
          prev: null,
          skip: newSkip,
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

    io.to(currRoom).emit('doubtLogicDone', {
      players: res.players,
      turn: res.turn,
      prev: res.prev,
      skip: res.skip,
      currentFace: res.currentFace,
      cardsInMiddle: res.cardsInMiddle, 
      cardsInLastChance: res.cardsInLastChance,
    });
  }
});




}