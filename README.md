# Multi-Room-Chat-Server
Using Node.js and Socket.IO, I and DK Kim created a multi-room chat server which enables users to create rooms and chat.

## Authors: Donggyu Kim, Hong Wi
## Behaviors:
- Below big, bold "Chat Rooms", there is a list of available rooms you can join.
- You can see your username under "Your Username :"
- You can see your current room under "Your room :"
- You can see other users in the same room under "Users in this room :"
- publicRoom is where all users will be first placed in. There is no Admin of this room.
- Whenever a user is (temporarily) kicked or (permanently) banned from the room, the user will automatically move to publicRoom.
- If you try to join a private room without providing correct password, then you will be alerted.
- If you click on 'Manage Rooms', you can see diverse options.
- Under 'Manage Rooms', you can make a room or send a private message to another user in the same room.
- If you want to create a room without password, type nothing into psw box.
- We did npm install nodemon and saved it to our package.json, so you can use 'npm start' command to run it.
- Clearing chat history: You can simply click the "Clear Room" button.
- Global announcement: Whenever a person joins or leaves the room, he notifies everyone in the room either he left or joined.
