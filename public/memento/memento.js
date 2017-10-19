// Memento Pattern demo by Joseph Noel and Carolyn Zang

// Memento Class
// Contains the state of an object to be restored
function Memento(state) {
    this.state = state;
    this.getState = function() {
        return this.state;
    }
}

// Originator Class
// Creates and stores states in the Memento object
function Originator() {
    this.state = "";
    this.setState = function(state) {
        this.state = state;
    }
    this.getState = function() {
        return this.state;
    }
    this.saveStateToMemento = function() {
        return new Memento(this.state);
    }
    this.getStateFromMemento = function(memento) {
        this.state = memento.getState();
    }
}

// Caretaker Class
// Restores the object state from Memento
function CareTaker() {
    this.mementoList = []
    this.add = function(memento) {
        this.mementoList.push(memento);
    }
    this.get = function(index) {
        return this.mementoList[index];
    }
    this.size = function() {
        return this.mementoList.length;
    }
}

// Construct objects
var originator = new Originator();
var caretaker = new CareTaker();


// For the purpose of this demo, state = text in textarea
$("#input").bind('input propertychange', function() {
    originator.setState($(this).val());
});

// Create memento from originator and save to caretaker
$("#save").click(function() {
    caretaker.add(originator.saveStateToMemento());
    var html = "<input class='two columns offset-by-one' type='button' value='Version " + caretaker.size() + "'>";
    $("#history").append(html);
});

// Pull memento from caretaker and restore state in originator
$("#history").click(function(event) {
    var version = $(event.target).val().slice(8);
    originator.getStateFromMemento(caretaker.get(version-1));
    $("#input").val(originator.getState());
});
