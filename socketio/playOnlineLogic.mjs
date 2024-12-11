import OnlineRoom from "../modals/PlayOnlineModel.mjs";

export default function playOnlineLogic(socket, io) {
  socket.on("playOnline", async ({ name, players, decks }) => {

      const foundOnlineRoom = await OnlineRoom.findOne({ 
        full: false, 
        playerNo: players, 
        decks: decks,  
      });

      if (!foundOnlineRoom) {
       
        const roomId = (Math.floor(100000 + Math.random() * 900000));
        const newOnlineRoom = new OnlineRoom({
          roomId: roomId,
          users: [{ name: name, socketId: socket.id, host: true }],
          playerNo: players,
          decks: decks,
          full : false
        });

        await newOnlineRoom.save();
        socket.join(roomId);

        socket.emit("onlineRoomCreated", { roomId });
        return;
      } else {
    
        foundOnlineRoom.users.push({ name: name, socketId: socket.id, host: false });
        if(foundOnlineRoom.users.length === foundOnlineRoom.playerNo){
          foundOnlineRoom.full = true;
        }
        await foundOnlineRoom.save();

        const roomName = foundOnlineRoom.roomId;
        socket.join(roomName);
        console.log(socket.rooms)

        socket.emit('roomJoined', { name: name, roomName: roomName, numPlayers: players, numDecks: decks })

        const playerNames = foundOnlineRoom.users.map((user) => user.name);
        console.log(playerNames)
        setTimeout(() => {
          io.to(roomName).emit("onlineJoined", { playerNames });
          const hostSocketId = foundOnlineRoom.users[0]?.socketId;
          if (hostSocketId) {
            io.to(hostSocketId).emit("onlineJoined", { playerNames });
          }
        }, 1000);

        console.log(`Room joined: ${name} joined room ${roomName}`);
      }
  });
}
