// Node modules
var request = require('request'),
    express = require('express'),
    twit = require('twit'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    path = require('path'),
    fs = require('fs'),
    json2csv = require('json2csv'),
    builder = require('xmlbuilder'),
    mongoose = require('mongoose'),
    striptags = require('striptags');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use('/js',    express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

// Twitter credentials
var client = new twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// Schema
var tweetSchema = mongoose.Schema({
  "created_at": String,
  "id": String,
  "text": String,
  "user_id": String,
  "user_name": String,
  "user_screen_name": String,
  "user_location": String,
  "user_followers_count": String,
  "user_friends_count": String,
  "user_created_at": String,
  "user_time_zone": String,
  "user_profile_background_color": String,
  "user_profile_image_url": String,
  "geo": mongoose.Schema.Types.Mixed,
  "coordinates": mongoose.Schema.Types.Mixed,
  "place": mongoose.Schema.Types.Mixed,
  "source": String,
  "retweeted": String
});

// Model
var Tweet = mongoose.model('Tweet', tweetSchema);

// File writing function
function writeToFile(tweets, format) {
  var wstream;
  var exists = false
  if (format=="JSON") {
    if (fs.existsSync('noelj-tweets.json')) {
      exists = true
    }
    wstream = fs.createWriteStream('noelj-tweets.json');
    wstream.write(JSON.stringify(tweets));
  } else if (format=="CSV") {
    if (fs.existsSync('noelj-tweets.csv')) {
      exists = true
    }
    wstream = fs.createWriteStream('noelj-tweets.csv');
    var fields = ["created_at","id","text","user_id","user_name","user_screen_name","user_location","user_followers_count","user_friends_count","user_created_at","user_time_zone","user_profile_background_color","user_profile_image_url","geo","coordinates","place"];
    var result = json2csv({data:tweets, fields: fields});
    wstream.write(result);
  } else {
    if (fs.existsSync('noelj-tweets.xml')) {
      exists = true;
    }
    wstream = fs.createWriteStream('noelj-tweets.xml');
    var doc = builder.create('tweets', { allowSurrogateChars: true });
    for (var i=0; i<tweets.length; i++) {
      var item = doc.ele('tweet');
      item.ele('created_at', tweets[i].created_at);
      item.ele('id', tweets[i].id);
      item.ele('text', tweets[i].text);
      item.ele('user_id', tweets[i].user_id);
      item.ele('user_name', tweets[i].user_name);
      item.ele('user_screen_name', tweets[i].user_screen_name);
      item.ele('user_location', tweets[i].user_location);
      item.ele('user_followers_count', tweets[i].user_followers_count);
      item.ele('user_friends_count', tweets[i].user_friends_count);
      item.ele('user_created_at', tweets[i].user_created_at);
      item.ele('user_time_zone', tweets[i].user_time_zone);
      item.ele('user_profile_background_color', tweets[i].user_profile_background_color);
      item.ele('user_profile_image_url', tweets[i].user_profile_image_url);
      item.ele('geo', tweets[i].geo);
      item.ele('coordinates', tweets[i].coordinates);
      item.ele('place', tweets[i].place),
      item.ele('source', tweets[i].source),
      item.ele('retweeted'), tweets[i].retweeted;
    }
    wstream.write(doc.end({pretty:true}));
  }
  wstream.end();
  if (exists==true) {
    return format + " file replaced."
  } else {
    return format + " file created."
  }
}

// Reduce tweet to necessary data
function reduceTweet(rawTweet) {
  var tweet = new Tweet({
    created_at: rawTweet.created_at,
    id: rawTweet.id,
    text: rawTweet.text,
    user_id: rawTweet.user.id,
    user_name: rawTweet.user.name,
    user_screen_name: rawTweet.user.screen_name,
    user_location: (rawTweet.user.location==null) ? 'null' : rawTweet.user.location,
    user_followers_count: rawTweet.user.followers_count,
    user_friends_count: rawTweet.user.friends_count,
    user_created_at: rawTweet.user.created_at,
    user_time_zone: (rawTweet.user.time_zone==null) ? 'null' : rawTweet.user.time_zone,
    user_profile_background_color: rawTweet.user.profile_background_color,
    user_profile_image_url: rawTweet.user.profile_image_url,
    geo: (rawTweet.geo==null) ? 'null' : rawTweet.geo,
    coordinates: (rawTweet.coordinates==null) ? 'null' : rawTweet.coordinates,
    place: (rawTweet.place==null) ? 'null' : rawTweet.place,
    source: striptags(rawTweet.source),
    retweeted: ("retweeted_status" in rawTweet) ? 'true' : 'false'
  });
  return tweet;
}

// This gets rid of a deprication message
// Could use bluebird, but unnecessary for this purpose
mongoose.Promise = global.Promise;
// Connect to database
mongoose.connect(process.env.MONGOLAB_URI, {
    useMongoClient: true
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

  // Default
  var RPI = ['-73.68', '42.72', '-73.67', '42.73'];

  // Keep track of clients by socket
  var clients = [];

  // client connected
  io.sockets.on('connection', function(socket) {
    // Add client to list
    clients.push(socket);

    // Received 'load' from client w/ data
    socket.on('load', function(data) {
      // Store data
      var keyword = data.Keyword;
      var amount = data.Amount;
      var exp = data.Export;

      // Initialize variables
      var received = 0;
      var stream = null;
      var tweet = null;

      // No keyword set
      if (keyword == '') {
        // Create twitter stream
        stream = client.stream('statuses/filter', {locations: RPI});
        // Twitter stream error
        stream.on('error', function(error) {
          console.log(error);
        });
        // Tweet from twitter stream
        stream.on('tweet', function(rawTweet) {
          // reduce
          tweet = reduceTweet(rawTweet);
          // save tweet to db
          tweet.save(function(err, tweet) {
            if (err) return console.error(err);
          });
          // Increment received
          received++;
          // Check for limit
          if (received>=amount) {
            // Stop stream
            stream.stop();
            // Write to console on finishing
            socket.emit('load', "Saved " + amount + " tweets to database.");
          }
        });
      } else {
        // Create twitter stream
        stream = client.stream('statuses/filter', {track: keyword});
        // Twitter stream error
        stream.on('error', function(error) {
          console.log(error);
        });
        // Tweet from twitter stream
        stream.on('tweet', function(rawTweet) {
          // reduce
          tweet = reduceTweet(rawTweet);
          // save tweet to db
          tweet.save(function(err, tweet) {
            if (err) return console.error(err);
          });
          // Increment received
          received++;
          // Check for limit
          if (received>=amount) {
            // Stop stream
            stream.stop();
            // Write to console on finishing
            socket.emit('load', "Saved " + amount + " tweets to database.");
          }
        });
      }
    });

    // Export received - load twitter data (if any) to file
    socket.on('export', function(data) {
      var query = Tweet.find().select('-_id');
      query.exec(function(err, tweets) {
        var format = data.Format;
        var msg = writeToFile(tweets, format);
        socket.emit('export', msg);
      });
    });

    // Received display request from client
    socket.on('display', function() {
      Tweet.find( function(err, tweets) {
        socket.emit('display', tweets);
      });
    });

    // Received reset option from client
    socket.on('reset', function() {
      Tweet.collection.remove();
      socket.emit('reset', "Form and tweets cleared.");
    });

    // Remove socket from client list on disconnect
    socket.on('disconnect', function() {
      var i = clients.indexOf(socket);
      clients.splice(i,1);
    });

    // Chart of num tweets vs. source device (bar)
    socket.on('sourceChart', function() {
      var sources = {};
      Promise.all([Tweet.count({source: 'Twitter for iPhone'}).exec(),
                   Tweet.count({source: 'Twitter for Android'}).exec(),
                   Tweet.count({source: 'Twitter Web Client'}).exec(),
                   Tweet.count().exec()])
      .then(results => {
        sources['iPhone'] = results[0];
        sources['Android'] = results[1];
        sources['Web'] = results[2];
        sources['Other'] = results[3] - results[2] - results[1] - results[0];
        socket.emit('sourceChart', sources);
      });
    });

    // Chart of num tweets vs. length (line)
    socket.on('lengthChart', function() {
      var lengths = {};
      Tweet.find({}, 'text', function(err, docs) {
        for (var i in docs) {
          var length = docs[i].text.length;
          if (length in lengths) {
            lengths[length] += 1;
          } else {
            lengths[length] = 1;
          }
        }
        socket.emit('lengthChart', lengths);
      });
    });

    // Chart of num original tweets vs. retweets
    socket.on('retweetChart', function() {
      var data = {};
      Promise.all([Tweet.count({retweeted: "true"}).exec(),
                   Tweet.count({retweeted: "false"}).exec()])
      .then(results => {
        data['Retweet'] = results[0];
        data['Original'] = results[1];
        socket.emit('retweetChart', data);
      })
    });
  });
});

app.get('/tnl', function(req, res) {
    res.sendFile(__dirname + '/tnl/index.html');
});

app.get('/socket.io/socket.io.js', function(req, res) {
    res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});

http.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});