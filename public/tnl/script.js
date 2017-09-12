// Connect socket
var socket = io.connect(window.location.href.slice(0,-4));

// Chart.js stuff
function sourceChart(name, data) {
  var labels = [], 
      values = [];
  for (var item in data) {
    labels.push(item);
    values.push(data[item]);
  }
  var ctx1 = $(name);
  var chart = new Chart(ctx1, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: ' # of tweets',
        data: values,
        backgroundColor: [
          'rgba(33,150,243,0.2)',
          'rgba(0,0,255,0.2)',
          'rgba(150,150,243,0.2)',
          'rgba(33,100,200,0.2)'
        ], 
        borderColor: [
          'rgba(33,150,243,1)',
          'rgba(0,0,255,1)',
          'rgba(150,150,243,1)',
          'rgba(33,100,200,1)'
        ],
        borderWidth: 1
      }]
    }, 
    options: {
      title: {
        display: true,
        text: "Tweet Sources",
        fontSize: 20,
        fontColor: "rgba(33,150,243,1)",
        padding: 20
      }
    }
  });
  return chart;  
}

function lengthChart(name, data) {
  var labels = [], 
      values = [];
  for (var item in data) {
    labels.push(item);
    values.push(data[item]);
  }
  var ctx1 = $(name);
  var chart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: ' # of Tweets',
        data: values,
        scaleSteps: 1,
        backgroundColor: [
          'rgba(33,150,243,0.2)'
        ], 
        borderColor: [
          'rgba(33,150,243,1)'
        ],
        borderWidth: 1
      }]
    }, 
    options: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: "Tweet Lengths",
        fontSize: 20,
        fontColor: 'rgba(33,150,243,1)',
        padding: 20
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: "Character Count"
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 16,
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: "# of Tweets"
          },
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });
  return chart;  
}

function retweetChart(name, data) {
  var labels = [], 
      values = [];
  for (var item in data) {
    labels.push(item);
    values.push(data[item]);
  }
  var ctx1 = $(name);
  var chart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: ' # of Tweets',
        data: values,
        scaleSteps: 1,
        backgroundColor: [
          'rgba(33,150,243,0.2)',
          'rgba(0,0,255,0.2)'
        ], 
        borderColor: [
          'rgba(33,150,243,1)',
          'rgba(0,0,255,1)'
        ],
        borderWidth: 1
      }]
    }, 
    options: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: "Tweet Originality",
        fontSize: 20,
        fontColor: 'rgba(33,150,243,1)',
        padding: 20
      },
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: "# of Tweets"
          },
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });
  return chart;  
}

// Had a lot of repeated code, so this function was born
// Will reveal the given "name" while hiding everything else
function showHide(name) {
  $(".status").empty();
  $("#tweets").empty();
  $("#landingWrapper").hide();
  $("#exportCard").hide();
  $("#resetCard").hide();
  $("#displayCard").hide();
  $("#loadCard").hide();
  $("#visualCard").hide();
  switch (name) {
    case "landing":
      $("#landingWrapper").show();
      break;
    case "export":
      $("#exportCard").show();
      break;
    case "reset":
      $("#resetCard").show();
      break;
    case "display":
      $("#displayCard").show();
      break;
    case "load":
      $("#loadCard").show();
      break;
    case "visual":
      $("#visualCard").show();
      break;
    default:
      console.log("showHide failed for " + name);
  }
}

// Angular stuff
angular
  .module('lab10', ['ngMaterial'])
  .config(function($mdThemingProvider) {
    $mdThemingProvider.theme('twitter')
    .primaryPalette('blue');
  })
  .controller('MainController', function($scope) {
    $scope.theme = 'twitter';
    $scope.keyword = '';
    $scope.formats = ['JSON', 'CSV', 'XML'];
    $scope.format = 'JSON';
    $scope.amount;
    $scope.showLoad = function() {
      showHide("load");
    }
    $scope.load = function() {
      $(".status").empty();
      socket.emit('load', {Keyword: $scope.keyword, Amount: $scope.amount});
    }
    $scope.showReset = function() {
      showHide("reset");     
    }
    $scope.reset = function() {
      $(".status").empty();
      $("#tweets").empty();
      socket.emit('reset');
      $scope.keyword = '';
      $scope.amount = '';
      $scope.format = 'JSON';
    }
    $scope.showDisplay = function() {
      showHide("display");
      $scope.display();    
    }
    $scope.display = function() {
      $(".status").empty();
      $("#tweets").empty();
      socket.emit('display');
    }
    $scope.showVisual = function() {
      showHide("visual");
      $scope.visualize();
    }
    $scope.visualize = function() {
      if (charts.length > 0) {
        for (var i in charts) {
          charts[i].destroy();
        }
      }
      socket.emit('sourceChart');
      socket.emit('lengthChart');
      socket.emit('retweetChart');
    }
    $scope.showExport = function() {
      showHide("export");     
    }
    $scope.export = function() {
      $(".status").empty();
      socket.emit('export', {Format: $scope.format});
    }
    $scope.showLanding = function() {
      showHide("landing");    
    }
  });

socket.on('display', function(tweets) {
  var string = [];
  for (var i=0; i<tweets.length; i++) {
    console.log(tweets[i]);
    var text = tweets[i].text,
        name = tweets[i].user_screen_name,
        img = tweets[i].user_profile_image_url;
    // Opening tags
    string.push("<md-card flex='30' md-theme='twitter'><md-card-title><md-card-title-text>");
    // Text
    string.push("<span class='md-headline'>" + text + "</span>");
    // Username
    string.push("<span class='md-subhead'>" + "@" + name + "</span>");
    // More tags
    string.push("</md-card-title-text><md-card-title-media>");
    // Img
    string.push("<img class='md-media-sm card-media' src='" + img + "' onerror='this.onerror=null;this.src=&quot;resources/default.jpg&quot;'>");
    // Some closing tags
    string.push("</md-card-title-media></md-card-title></md-card>");
  }
  if (string.length > 0) {
    $("#tweets").append(string.join(''));
    $(".status").append("Displaying " + tweets.length + " tweets.");
  } else {
    $(".status").append("No tweets in database.");
  }
});

var charts = [];

socket.on('sourceChart', function(data) {
  charts.push(sourceChart('#chart1', data));
});

socket.on('lengthChart', function(data) {
  charts.push(lengthChart('#chart2', data));
});

socket.on('retweetChart', function(data) {
  charts.push(retweetChart('#chart3', data));
});

socket.on('load', function(msg) {
  $(".status").append(msg);
});

socket.on('reset', function(msg) {
  $(".status").append(msg);
});

// File was exported
socket.on('export', function(msg) {
  $(".status").append(msg);
});