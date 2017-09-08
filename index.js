var express = require('express'),
    app = express(),
    server = require('http').createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

  server.listen(5000, function () {
    console.log('Quiz 2 listening on port 8000...');
  });