import express from "express";
import { fileURLToPath } from 'node:url';
import path from 'path';
import connectDB from "./config/connectDB.js";
import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import corsOptions from "./config/corsConfig.js";
import cors from 'cors';
import { Server } from "socket.io";
import http from 'http';


configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3500;



const server = http.createServer(app);
const io = new Server(server , {
  cors : {
    origin : 'http://localhost:300',  // frontend url in production
    methods : ['GET' , 'POST']
  }
});

export const getIo = () => {
  if(!io) throw new Error('Socket.io not initialized');
  return io; 
}



connectDB();

app.use(cors(corsOptions));

app.use(express.json());

app.use('/' , express.static(path.join(__dirname , 'public')));

mongoose.connection.once('open' , () => {
  console.log('connected to database')
  app.listen(PORT , () => console.log(`server running on port ${PORT}`));
})

mongoose.connection.on('error' , (err) => {
  console.log(err);
})
