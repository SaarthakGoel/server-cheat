import express from "express";
import { fileURLToPath } from 'node:url';
import path from 'path';
import connectDB from "./config/connectDB.js";
import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import corsOptions from "./config/corsConfig.js";
import cors from 'cors';
import { Server } from "socket.io";
import socketHandler from "./socketio/ioConnection.js";


configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3500;

connectDB();

app.use(cors(corsOptions));

app.use(express.json());

app.use('/' , express.static(path.join(__dirname , 'public')));

const server =  app.listen(PORT , () => console.log(`server running on port ${PORT}`));

mongoose.connection.once('open' , () => {
  console.log('connected to database')
})

mongoose.connection.on('error' , (err) => {
  console.log(err);
})

const io = new Server(server , {
  cors : {
    origin : 'https://bluff-juthsach.vercel.app',  // frontend url in production
    methods : ['GET' , 'POST']
  }
});

socketHandler(io);

//http://localhost:3000