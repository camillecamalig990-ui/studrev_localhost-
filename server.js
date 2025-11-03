const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'stud.rev-localhost/public')));

// Optional: ensure root URL serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'stud.rev-localhost/public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
