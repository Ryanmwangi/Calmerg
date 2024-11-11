import express from 'express';
import path from 'path';
import routes from './routes.js';

const app = express();
app.use(express.json());


// Serve static files from the 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/', routes);


export default app;
