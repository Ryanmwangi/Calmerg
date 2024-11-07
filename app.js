import server from './server.js';

const port = process.env.NODE_PORT || 3000;
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
