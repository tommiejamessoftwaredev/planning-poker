# Agile Planning Poker

A single page React Typescript App, with an express.js backend, using Socket.io for real-time event-based communication. Allows players to connect and vote when story-pointing tickets.

## How to run

### In the root directory, run:
### 1. `cd client`
### 2. `npm install`
### 3. `npm run build` - (this is the built version of the client the server will serve)

### 4. `cd ../server`
### 5. `npm install`
### 6. `npm start` - starts the local server that serves the built client

Open [http://localhost:8080/](http://localhost:8080/) to view it in the browser.




## Latest Deployment
Whenever branch ```main``` is updated, it's automatically deployed using github actions to the azure app service where it's hosted:

[https://planning-poker-100.azurewebsites.net/](https://planning-poker-100.azurewebsites.net/) 