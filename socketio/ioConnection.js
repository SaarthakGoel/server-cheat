import gameLogic from "./gameLogic.mjs";
import roomLogic from "./roomLogic.mjs";

export default function socketHandler(io) {

  io.on('connection', (socket) => {
    console.log(`user connected`, socket.id);

    roomLogic(socket , io);
    gameLogic(socket , io);

  })

}
