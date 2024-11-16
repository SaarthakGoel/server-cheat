import Room from "../modals/RoomModel.mjs"

export default function socketHandler(io) {

  io.on('connection', (socket) => {
    console.log(`user connected`, socket.id)

    socket.on('createRoom', async ({ name, room, players, decks }) => {
      console.log(`room created`, name, room, players, decks)

      const findroom = await Room.findOne({ roomId: room })

      if (findroom) {
        socket.emit('roomAlreadyExists', { message: "Room with this name Already exists" });
        return;
      }

      const newRoom = new Room({
        roomId: room,
        users: [{ name: name, socketId: socket.id }],
        playerNo: players,
        decks: decks
      })

      const result = await newRoom.save();

      socket.emit('roomCreated')

      socket.join(room)
    })

    socket.on('joinRoom', async ({ name, room }) => {

      const findroom = await Room.findOne({ roomId: room })


      if (!findroom) {
        socket.emit('roomNotExist', { message: "Room Does Not Exist" })
        return;
      }

      if (findroom?.users?.length === findroom?.playerNo) {

        const userExists = findroom.users.some((user) => user.socketId === socket.id);

        if (userExists) {
          findroom.users = findroom.users.filter((user) => user.socketId !== socket.id);
          findroom.users.push({ name: name, socketId: socket.id });
          const res = await findroom.save();
          const roomName = room;
          const numPlayers = findroom.playerNo;
          const numDecks = findroom.decks;
          socket.emit('roomJoined', { name: name, roomName: roomName, numPlayers: numPlayers, numDecks: numDecks })
          socket.join(room);
          console.log(`room Joined`, name, room);
          return;
        }

        socket.emit('roomFullError', { message: "Room is Full" })
        return;
      }

      if (findroom) {
        findroom.users.push({ name: name, socketId: socket.id });
        const res = await findroom.save();
        const roomName = room;
        const numPlayers = findroom.playerNo;
        const numDecks = findroom.decks;
        socket.emit('roomJoined', { name: name, roomName: roomName, numPlayers: numPlayers, numDecks: numDecks })
        socket.join(room);
        console.log(`room Joined`, name, room);
      }
    })

    socket.on('disconnect', async () => {
      console.log(`user`, socket.id, `disconnected`)
      const foundRoom = await Room.findOne({ 'users.socketId': socket.id })
      if (foundRoom) {
        if (foundRoom.users.length === 1) {
          await Room.findOneAndDelete({ roomId: foundRoom.roomId })
        } else {
          foundRoom.users = foundRoom.users.filter((user) => user.socketId !== socket.id);
          await foundRoom.save();
        }
      }
    })
  })

}
