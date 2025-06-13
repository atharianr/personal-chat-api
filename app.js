// app.js (or server.js)
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';
import { auth, db } from './src/firebase.js'; // Add .js extension
import chatRoutes from './src/routes/chat.js'; // Add .js extension

const app = express();
const allowedOrigins = ['https://shields.atharianr.dev', 'http://localhost:3000'];

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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
