const express = require('express');
const path = require('path');
const app = express();

// Serve files from your public folder
app.use(express.static(path.join(__dirname, 'stud.rev-localhost/public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
