if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to test.";
  };

  Template.hello.events({
    'click input': function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    console.log(Assets.getText('woop.js'));
    console.log(Assets.getText('test.lazy.js.js'));
    Lazy.load('test.lazy.js');
    console.log(Assets.getText("test.lazy.js.js"));
  });
}

