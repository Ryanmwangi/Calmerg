import express from 'express';
import path from 'path';
import routes from './routes.js';

console.log(`Starting server in ${process.cwd()}`);

const app = express();
app.use(express.json());

// Mount API routes BEFORE static files
// This ensures that API requests are handled by your routes first
app.use('/', routes);

// Serve static files from the 'public' directory
// This will only handle requests that weren't matched by the routes
app.use(express.static(path.join(process.cwd(), 'public')));

// Optional: Add a catch-all route for client-side routing
app.get('*', (req, res) => {
    // Only serve index.html for non-API, non-file requests
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

export default app;