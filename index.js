var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use('/js',  express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js',  express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js',  express.static(__dirname + '/node_modules/popper.js/dist/umd')); // redirect popper.js
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/font-awesome/css')); // redirect font-awesome css
app.use('/fonts', express.static('./node_modules/font-awesome/fonts')) // redirect font-awesome fonts

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});