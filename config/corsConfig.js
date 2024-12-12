const allowedOrigins = [
  'http://localhost:3000',
  'https://bluff-juthsach.vercel.app',
]

const corsOptions = {
  origin : (origin , callback) => {
    if(allowedOrigins.indexOf(origin) !== -1 || !origin){
      callback(null , true);
    }else{
      callback(new Error('not allowed by cors'))
    }
  },
  credentials : true,
  optionsSuccessStatus : 200
}

export default corsOptions;