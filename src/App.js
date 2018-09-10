import React, { Component } from "react";
import "./App.css";
import firebase from "./firebase";
import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import _ from "lodash";
import swal from "sweetalert2";

//COMPONENTS//

import EventPage from "./components/EventPage/EventPage";
import OverviewPage from "./components/OverviewPage";
import EditFriend from "./components/EditFriend";

//COMPONENTS
import ExistingFriendList from "./components/ExistingFriendList";

const dbRef = firebase.database().ref();
const provider = new firebase.auth.GoogleAuthProvider();
const auth = firebase.auth();

class App extends Component {
  constructor() {
    super();
    this.state = {
      userProfile: null,
      selectedEventIndex: null,
      selectedFriend: null,
      loggedIn: false,
      user: "",
      currentTextValue: "",
      loginPurpose: "",
      key: "",
      signInAndLogIn: false,
      savedRecipes: []
    };
  }

  toggleRecipe = (recipeObj, action) => {
    console.log(action);
    let tempArr = this.state.savedRecipes;

    // if user is saving the recipe
    if (action === "save") {
      // if recipe to be saved is already in saved recipes
      if (_.findIndex(tempArr, ["id", recipeObj.id]) !== -1) {
        swal({ type: "warning", title: "Recipe already saved!" });
        return;
      } else {
        // add recipe to temporary recipes array
        tempArr.push(recipeObj);

        console.log(this.state.savedRecipes);

        // create copy of current party object
        let currentUserParty = this.state.userProfile.parties[this.state.selectedEventIndex];

        // if there are no saved recipes yet, initialize one
        if (!currentUserParty.savedRecipes) {
          currentUserParty.savedRecipes = [];
        }

        currentUserParty.savedRecipes = tempArr;

        // put new array of saved recipes to firebase
        dbRef.child(`${this.state.key}/parties/${this.state.selectedEventIndex}`).set(currentUserParty);
      }
    }
    // if user is removing the saved recipe
    else {
      tempArr.splice(_.findIndex(tempArr, ["id", recipeObj.id]), 1);
      console.log(tempArr);
      let currentUserParty = this.state.userProfile.parties[this.state.selectedEventIndex];
      currentUserParty.savedRecipes = tempArr;
      dbRef.child(`${this.state.key}/parties/${this.state.selectedEventIndex}`).set(currentUserParty);
    }
  };

  // Function for create button
  checkIfUserExists = snapshot => {
    // if userInput is blank, leave the function
    if (!this.state.user) {
      return;
    }

    let counter = 0;
    let currentInfoFromFirebase = Object.values(snapshot);

    currentInfoFromFirebase.map(userObject => {
      // If the user input is found within the current firebase and the user clicked "CREATE", reset user state to "" so nothing displays
      if (this.state.loginPurpose === "create" && userObject.user === this.state.user) {
        this.setState({
          user: ""
        });
        swal({
          type: "warning",
          title: "User name already exists!",
          text: `Please create another user name."`
        });
        return;
      }

      // when person is found
      if (
        (this.state.loginPurpose === "sign-in" ||
          this.state.loginPurpose === "guest" ||
          this.state.loginPurpose === "demo") &&
        userObject.user === this.state.user
      ) {
        this.setState({
          userProfile: userObject,
          loggedIn: true,
          key: userObject.id
        });
        return;
      }

      // If the user input is not found within the current firebase object, increment the counter by 1
      if (userObject.user !== this.state.user) {
        counter++;
      }

      // If this conditional is true, then the userInput does not exist yet and will be added to firebase
      if (counter === currentInfoFromFirebase.length) {
        let user = this.state.user;
        let friends = [{ name: this.state.user }];
        let parties = [];

        // if user clicked create button, create new user on firebase
        if (this.state.loginPurpose === "create") {
          console.log("creating new users");
          this.setState({ loginPurpose: "sign-in", signInAndLogIn: true }, () => {
            let id = dbRef.push(this.state.user).key;
            dbRef.child(id).set({ user, friends, parties, id });
            return;
          });
        } else if (this.state.signInAndLogIn === false) {
          swal({
            type: "warning",
            title: "User name not recognized!",
            text: `Please sign in with a correct user name."`
          });
          this.setState({ user: "" });
        }
      }
    });
  };

  // Handling for form submit
  handleSubmitLogin = e => {
    e.preventDefault();

    if (this.state.loginPurpose === "sign-in" || this.state.loginPurpose === "create") {
      auth.signInWithPopup(provider).then(res => {
        //create user on firebase
        this.setState({ user: res.user.displayName }, () => {
          dbRef.on("value", snapshot => {
            this.checkIfUserExists(snapshot.val());
          });
        });
      });
    } else {
      auth.signInAnonymously().then(res => {
        let userName = "Demo";

        // if guest account, reset guest account
        if (this.state.loginPurpose === "guest") {
          userName = "Guest";
          dbRef.child("default").set({
            id: "default",
            user: "Guest",
            friends: [{ name: "Guest" }]
          });
        }

        this.setState({ user: userName }, () => {
          dbRef.on("value", snapshot => {
            this.checkIfUserExists(snapshot.val());
          });
        });
      });
    }
  };

  // Handling for click of either sign in or create buttons
  handleClickLogin = e => {
    this.setState({
      loginPurpose: e.target.value
    });
  };

  // Reset stats back to default when logged out
  handleLogout = e => {
    auth.signOut().then(res => {
      this.setState({
        userProfile: null,
        selectedEventIndex: null,
        selectedFriend: null,
        loggedIn: false,
        user: "",
        currentTextValue: "",
        loginPurpose: "",
        key: ""
      });
      dbRef.off();
    });
  };

  // Set state for selecting an event (used in overview page)
  selectEvent = e => {
    this.setState(
      {
        selectedEventIndex: Number(e.target.id)
      },
      () => {
        if (this.state.userProfile.parties[this.state.selectedEventIndex].savedRecipes) {
          this.setState({
            savedRecipes: this.state.userProfile.parties[this.state.selectedEventIndex].savedRecipes
          });
        }
      }
    );
  };

  // Function with props for the single event page
  singleEvent = () => {
    return (
      <EventPage
        userProfile={this.state.userProfile}
        selectedEvent={this.state.userProfile.parties[this.state.selectedEventIndex]}
        handleBackToOverview={this.handleBackToOverview}
        selectFriend={this.selectFriend}
        handleLogout={this.handleLogout}
        toggleRecipe={this.toggleRecipe}
        savedRecipes={this.state.savedRecipes}
      />
    );
  };

  // Handler for going back to the main page from the single event page
  handleBackToOverview = e => {
    this.setState({
      selectedEventIndex: null
    });
  };

  // Handler for going back to event page from editing a friend (used in edit friend)
  handleBackToEvent = e => {
    this.setState({
      selectedFriend: null
    });
  };

  // Set state for selecting a friend (used in Event Page)
  selectFriend = e => {
    this.setState({
      selectedFriend: e.target.id
    });
  };

  render() {
    return (
      <Router>
        <div className="App">
          {/* Current router setup is possibly just a placeholder.
          /// Making sure it's not visible when hitting other pages of the site.
          /// decide if we should make the login page into a component?   */}
          <Route
            exact
            path="/"
            render={() => {
              return (
                <section className="log-in-page">
                  <div className="wrapper">
                    <h1 className="app-name">DinnerSafe</h1>
                    <h2 className="app-name-sub-header">Party guests with allergies and diet restrictions?</h2>
                    <h2 className="app-name-sub-header">Find recipes that everyone can eat!</h2>
                    <form className="log-in-form clearfix" action="" onSubmit={this.handleSubmitLogin}>
                      <div className="buttons clearfix">
                        <button className="left" value="sign-in" onClick={this.handleClickLogin}>
                          SIGN IN
                        </button>
                        <button className="right" value="create" onClick={this.handleClickLogin}>
                          CREATE
                        </button>
                        <button className="guest" onClick={this.handleClickLogin} value="guest">
                          CONTINUE AS GUEST
                        </button>
                        <button className="demo" onClick={this.handleClickLogin} value="demo">
                          DEMO
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              );
            }}
          />

          {/* REDIRECT FOR OVERVIEW PAGE: wait for userProfile to be ready */}
          <Route
            path="/"
            render={() => {
              return this.state.userProfile && this.state.loggedIn === true && this.state.key ? (
                <Redirect to="/home" />
              ) : null;
            }}
          />

          {/* OVERVIEW PAGE */}
          <Route
            path="/home"
            render={props => (
              <OverviewPage
                {...props}
                userProfile={this.state.userProfile}
                handleLogout={this.handleLogout}
                selectEvent={this.selectEvent}
                userID={this.state.key}
              />
            )}
          />

          {/* REDIRECT FOR SINGLE EVENT PAGE ROUTE: wait for selected event index to be ready */}
          <Route
            exact
            path="/home"
            render={() => {
              return this.state.selectedEventIndex ? <Redirect to="/event" /> : null;
            }}
          />

          {/* SINGLE EVENT PAGE ROUTE */}
          <Route path="/event" render={this.singleEvent} />

          {/* REDIRECT FOR EDIT FRIEND ROUTE: wait for selected friend state to be ready*/}
          <Route
            path="/event"
            render={() => {
              return this.state.selectedFriend ? <Redirect to="/edit-friend" /> : null;
            }}
          />

          {/* EDIT FRIEND PAGE ROUTE */}
          <Route
            path="/edit-friend"
            render={props => (
              <EditFriend
                {...props}
                friendProfile={
                  this.state.userProfile.friends[
                    _.findIndex(this.state.userProfile.friends, ["name", this.state.selectedFriend])
                  ]
                }
                friendKey={_.findIndex(this.state.userProfile.friends, ["name", this.state.selectedFriend])}
                userID={this.state.userProfile.id}
                handleBackToEvent={this.handleBackToEvent}
              />
            )}
          />

          {/* ADD EXISTING FRIEND ROUTE */}
          <Route
            path="/existing-friend-list"
            render={props => (
              <ExistingFriendList
                {...props}
                userProfile={this.state.userProfile}
                selectedEventIndex={this.state.selectedEventIndex}
              />
            )}
          />
        </div>
      </Router>
    );
  }

  componentDidMount() {
    auth.onAuthStateChanged(user => {
      // if previous user had an email (i.e not a guest/demo), automatically log-in
      if (user.emailVerified === true) {
        this.setState({ user: user.displayName, loginPurpose: "sign-in" }, () => {
          dbRef.on("value", snapshot => {
            this.checkIfUserExists(snapshot.val());
          });
        });
      }
    });
  }
}

export default App;
