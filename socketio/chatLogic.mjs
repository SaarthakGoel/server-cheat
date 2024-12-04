


export default function chatLogic(socket , io) {
  
  socket.on('chatSend' , ({name , currRoom , message}) => {
    io.to(currRoom).emit('chatSended' , {name , message});
  })

}