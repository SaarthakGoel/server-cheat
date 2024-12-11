import GameData from "../modals/GameDataModel.mjs";
import Room from "../modals/RoomModel.mjs"

export default function roomLogic(socket, io) {

  socket.on('createRoom', async ({ name, room, players, decks }) => {
    console.log(`room created`, name, room, players, decks)

    const findroom = await Room.findOne({ roomId: room })

    if (findroom) {
      socket.emit('roomAlreadyExists', { message: "Room with this name Already exists" });
      return;
    }

    const newRoom = new Room({
      roomId: room,
      users: [{ name: name, socketId: socket.id, host: true }],
      playerNo: players,
      decks: decks
    })

    const result = await newRoom.save();

    socket.emit('roomCreated')
    socket.join(room);
    io.to(Number(room)).emit('playerJoined', { playerName: [name] })
  })

  socket.on('joinRoom', async ({ name, room }) => {

    const findroom = await Room.findOne({ roomId: room })


    if (!findroom) {
      socket.emit('roomNotExist', { message: "Room Does Not Exist" })
      return;
    }

    const duplicateName = findroom.users.find((user) => user.name === name);
    if(duplicateName){
      socket.emit('duplicateName', { message: "Name already being used in room" })
      return;
    }

    if (findroom?.users?.length === findroom?.playerNo) {

      const userExists = findroom.users.some((user) => user.socketId === socket.id);

      if (userExists) {
        findroom.users = findroom.users.filter((user) => user.socketId !== socket.id);
        if (userExists.host === true) {
          findroom.users.push({ name: name, socketId: socket.id, host: true });
        } else {
          findroom.users.push({ name: name, socketId: socket.id, host: false });
        }
        const res = await findroom.save();
        const roomName = room;
        const numPlayers = findroom.playerNo;
        const numDecks = findroom.decks;
        socket.emit('roomJoined', { name: name, roomName: roomName, numPlayers: numPlayers, numDecks: numDecks })
        socket.join(room);
        const playerName = findroom.users.map((user) => user.name);
        setTimeout(() => {
          io.to(Number(room)).emit('playerJoined', { playerName })
        },1000)
        console.log(`room Joined`, name, room);
        return;
      }

      socket.emit('roomFullError', { message: "Room is Full" })
      return;
    }

    if (findroom) {
      findroom.users.push({ name: name, socketId: socket.id, host: false });
      const res = await findroom.save();
      const roomName = room;
      const numPlayers = findroom.playerNo;
      const numDecks = findroom.decks;
      socket.emit('roomJoined', { name: name, roomName: roomName, numPlayers: numPlayers, numDecks: numDecks })
      socket.join(Number(room));
      const playerName = findroom.users.map((user) => user.name);
      setTimeout(() => {
        io.to(Number(room)).emit('playerJoined', { playerName });
        io.to(findroom.users[0].socketId).emit('playerJoined', { playerName });
      },1000)
      console.log(`room Joined`, name, room);
    }
  })

  socket.on('disconnect', async () => {
    console.log(`User ${socket.id} disconnected`);

    // Find the room where the user was part of
    const foundRoom = await Room.findOne({ 'users.socketId': socket.id });

    if (foundRoom) {
      // If the room has only one user, delete the room and the game (if it exists)
      if (foundRoom.users.length === 1) {
        const foundGameData = await GameData.findOne({roomId : foundRoom.roomId});
        if(foundGameData){
          await GameData.findOneAndDelete({roomId : foundRoom.roomId});
        }
        await Room.findOneAndDelete({ roomId: foundRoom.roomId });
        console.log(`Room ${foundRoom.roomId} deleted as it was empty.`);
        return;
      }

      // Identify the leaving player
      const leavingPlayer = foundRoom.users.find((user) => user.socketId === socket.id);
      if (!leavingPlayer) {
        console.error(`Leaving player not found in room: ${foundRoom.roomId}`);
        return;
      }

      // Update the player list by removing the leaving player
      foundRoom.users = foundRoom.users.filter((user) => user.socketId !== socket.id);

      // Promote a new host if the leaving player was the host
      if (leavingPlayer.host) {
        foundRoom.users[0].host = true; // Assign host to the first user in the list
      }

      // Save the updated room
      await foundRoom.save();

      // Broadcast the updated player list to the room
      const playerNames = foundRoom.users.map((user) => user.name);
      console.log(playerNames)
      io.to(Number(foundRoom.roomId)).emit('playerLeft', { playerName: playerNames });

      console.log(`Updated room ${foundRoom.roomId} after disconnection.`);
    }
  });
}
