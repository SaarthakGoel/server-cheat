const allowedOrigins = [
  'http://localhost:3000',
]

const corsOptions = {
  origin : (origin , callback) => {
    if(allowedOrigins.indexOf(origin) !== -1 || !origin){
      callback(nulll , true);
    }else{
      callback(new Error('not allowed by cors'))
    }
  },
  Credentials : true,
  optionsSuccessStatus : 200
}

export default corsOptions;