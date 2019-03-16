import morgan from 'morgan'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import express from 'express'
import * as dotenv from 'dotenv'
dotenv.config()         //load in the env variables
const app = express();  //startup express


// connect to mongodb
mongoose.connect(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0-7gj0v.mongodb.net/test?retryWrites=true`,
    {
        useNewUrlParser: true
    }
).catch((err:string) => console.log('error:', err))

//middleware to use before going to the routes
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//CORS stuff
app.use((req:any, res:any, next:any) =>{
    res.header('Access-Control-Allow-Origin', '*') //allow acess to anyone
    res.header('Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    //if the browser sends an options request asking what is it allowed to ask for so return valid response
    if (req.method === 'OPTIONS') {
        res.header('Acess-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET')
        return res.status(200).json({})
    }
    next() //always return next so the other routes can take over
})

import arbRoutes from './api/routes/arbitrages';

// const gamesRoutes = require('./api/routes/games');

// //routes which handle requests
// app.use('/users', usersRoutes)
// app.use('/games', gamesRoutes)

app.use('/', (res:any, req:any, next:any) =>{
    const error: any = new Error('Not Found')
    error.status = 404
    next(error);
})

app.use((error:any, _req:any, res:any, _next:any) =>{
    res.status(error.status || 500)
    res.json({
        error:{
            message: error.message
        }
    })
})

export default app;