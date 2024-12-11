import chatLogic from "./chatLogic.mjs";
import gameLogic from "./gameLogic.mjs";
import playOnlineLogic from "./playOnlineLogic.mjs";
import roomLogic from "./roomLogic.mjs";

export default function socketHandler(io) {

  io.on('connection', (socket) => {
    console.log(`user connected`, socket.id);

    roomLogic(socket , io);
    gameLogic(socket , io);
    chatLogic(socket , io);
    playOnlineLogic(socket , io);
  })

}
