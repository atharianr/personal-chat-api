// app.js (or server.js)
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';
import { auth, db } from './src/firebase.js'; // Add .js extension
import chatRoutes from './src/routes/chat.js'; // Add .js extension

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Handling CORS
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header(
//         'Access-Control-Allow-Headers',
//         'Origin, X-Requested-With, Content-Type, Accept, Authorization'
//     );
//     if (req.method === 'OPTIONS') {
//         res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
//         return res.status(200).json({});
//     }
//     next();
// });

app.use(cors({
    origin: ['*'], // or '*' for all origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // if you need cookies or authorization headers
}));

// Routing
app.use('/', chatRoutes);

// Custom error
app.use((req, res, next) => {
    const error = new Error('Endpoint Not found');
    error.status = 404;
    next(error);
});

// Error handler
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

// console.log('Auth:', auth);
// console.log('Firestore:', db);

export default app;
