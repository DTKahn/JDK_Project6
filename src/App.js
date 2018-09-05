import React, { Component } from "react";
import "./App.css";
import firebase from "./firebase";
//COMPONENTS//
import apiCall from "./components/apiCall";

const dbRef = firebase.database().ref();

/* ===================
TEST STUFF BELOW THAT CAN BE DELETED WHEN DONE
==================== */
let user = "Bill";
let friends = [
  {
    name: "Rosie",
    allergies: ["Apple", "Bananas"],
    parties: ["sept3", "oct5"]
  },
  {
    name: "Moin",
    allergies: ["Grapes", "Cookies"],
    parties: ["sept3", "oct5"]
  }
];

let parties = [
  {
    title: "sept3",
    recipes: ["Pie", "McDonald's"]
  },
  {
    title: "oct5",
    recipes: ["Peanut", "Pizza"]
  }
];

// let newkey = dbRef.push(user).key;
// dbRef.child(newkey).set({ user, friends, parties });

/* ===================
TEST STUFF ABOVE THAT CAN BE DELETED WHEN DONE
==================== */

class App extends Component {
  constructor() {
    super();
    this.state = {
      allowedAllergies: [],
      allowedDiet: [],
      userProfile: {},
      user: "",
      currentTextValue: "",
      loginPurpose: ""
    };
  }

  /* FUNCTION TO GET EVENTS FROM FIREBASE */
  retrieveEventsFromFirebase = snapshot => {
    let newResults = Object.values(snapshot);

    newResults.forEach(person => {
      if (user === person.user) {
        this.setState({
          userProfile: newResults
        });
      }
    });
  };

  // Function for create button
  checkIfUserExists = userInput => {
    // if userInput is blank, leave the function
    if (userInput.length === 0) {
      return;
    }

    let counter = 0;
    let currentInfoFromFirebase = Object.values(this.state.userProfile);

    currentInfoFromFirebase.map(userObject => {
      // If the user input is found within the current firebase and the user clicked "CREATE", reset user state to "" so nothing displays
      if (
        this.state.loginPurpose === "create" &&
        userObject.user === userInput
      ) {
        this.setState({
          user: ""
        });
        alert(
          "Name already exists. Please create an account with another name."
        );
      }

      // If the user input is not found within the current firebase object, increment the counter by 1
      if (userObject.user !== userInput) {
        counter++;
      }

      // If this conditional is true, then the userInput does not exist yet and will be added to firebase
      if (counter === currentInfoFromFirebase.length) {
        let user = userInput;
        let friends = [];
        let parties = [];

        // if user clicked create button, create new user on firebase
        if (this.state.loginPurpose === "create") {
          let newKey = dbRef.push(userInput).key;
          dbRef.child(newKey).set({ user, friends, parties });
        } else {
          alert("You should create an account!");
        }
      }
    });
  };

  // Handling for form submit
  handleSubmit = e => {
    e.preventDefault();
    e.target.reset();

    //create user on firebase
    this.setState({
      user: this.state.currentTextValue
    });

    this.checkIfUserExists(this.state.currentTextValue);
  };

  // Handling for text input
  handleChange = e => {
    this.setState({
      currentTextValue: e.target.value
    });
  };

  // Handling for click of either sign in or create buttons
  handleClickLogin = e => {
    this.setState({
      loginPurpose: e.target.value
    });
  };

  render() {
    return (
      <div className="App">
        <h1>JDK PROJECT!!!</h1>

        {/* FIRST PAGE: USER LOGIN */}
        <form action="" onSubmit={this.handleSubmit}>
          <label htmlFor="create-user">USERNAME</label>
          <input onChange={this.handleChange} id="create-user" type="text" />
          <button value="sign-in" onClick={this.handleClickLogin}>
            SIGN IN
          </button>
          <button value="create" onClick={this.handleClickLogin}>
            CREATE
          </button>
        </form>

        {/* MAP THROUGH EVERY USER OBJECT RECEIVED FROM FIREBASE */}
        {Object.values(this.state.userProfile).map(property => {
          // if the user name is equal to the user we want
          if (property.user === this.state.user) {
            // display's user name
            return (
              <div>
                <h1>{property.user}</h1>
                {/* Go through parties object and list all the parties and their recipes */}
                {property.parties === undefined
                  ? null
                  : property.parties.map(party => {
                      return (
                        <div>
                          <h2>{party.title}</h2>
                        </div>
                      );
                    })}
              </div>
            );
          }
        })}
      </div>
    );
  }

  componentDidMount() {
    dbRef.on("value", snapshot => {
      this.retrieveEventsFromFirebase(snapshot.val());
    });
  }
}

export default App;
