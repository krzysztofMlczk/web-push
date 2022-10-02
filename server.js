require("dotenv").config();
const express = require("express");
const webpush = require("web-push");
const bodyparser = require("body-parser");

const CyclicDb = require("cyclic-dynamodb");
const db = CyclicDb("pink-spotless-starfishCyclicDB");
const subscriptions = db.collection("subscriptions");

const vapidDetails = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT,
};

function sendNotifications(subs) {
  // Create the notification content.
  const notification = JSON.stringify({
    title: "Hello, Notifications!",
    options: {
      body: `ID: ${Math.floor(Math.random() * 100)}`,
    },
  });
  // Customize how the push service should attempt to deliver the push message.
  // And provide authentication information.
  const options = {
    TTL: 10000,
    vapidDetails: vapidDetails,
  };
  // Send a push message to each client specified in the subscriptions array.
  subs.forEach((sub) => {
    const endpoint = sub.endpoint;
    const id = endpoint.substr(endpoint.length - 8, endpoint.length);
    webpush
      .sendNotification(subscription, notification, options)
      .then((result) => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Result: ${result.statusCode}`);
      })
      .catch((error) => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Error: ${error} `);
      });
  });
}

const app = express();
app.use(bodyparser.json());
app.use(express.static("public"));

app.post("/add-subscription", async (request, response) => {
  console.log(`Subscribing ${request.body.endpoint}`);
  try {
    const newSub = await subscriptions.set(request.body.endpoint, request.body);
    console.log(newSub);
    response.sendStatus(200);
  } catch (err) {
    console.log(err);
    response.sendStatus(500);
  }
});

app.post("/remove-subscription", async (request, response) => {
  console.log(`Unsubscribing ${request.body.endpoint}`);
  try {
    await subscriptions.delete(request.body.endpoint);
    response.sendStatus(200);
  } catch (err) {
    console.log(err);
    response.sendStatus(500);
  }
});

app.post("/notify-me", async (request, response) => {
  console.log(`Notifying ${request.body.endpoint}`);
  const subscription = await subscriptions.get(request.body.endpoint);
  console.log(subscription);
  sendNotifications([subscription.props]);
  response.sendStatus(200);
});

app.post("/notify-all", async (request, response) => {
  console.log("Notifying all subscribers");
  const subs = await subscriptions.list();
  if (subscriptions.length > 0) {
    sendNotifications(subscriptions);
    response.sendStatus(200);
  } else {
    response.sendStatus(409);
  }
});

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${listener.address().port}`);
});
