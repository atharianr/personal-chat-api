import 'dotenv/config';
import http from 'http';
import app from './app.js';

const port = 4000;
const server = http.createServer(app);
server.listen(port);