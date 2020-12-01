import WebSocket from 'ws'
import * as uuid from 'uuid';
import { messageTypes } from '../client/message-types.js'

const webSocketServer = new WebSocket.Server({ port: 8080 });
const users = {}

webSocketServer.on('connection', (connection) => {
	let user = {
		connection,
		userId: uuid.v4()
	}

	users[user.userId] = user

	sendToUser(user, { type: messageTypes.signalServerConnected, userId: user.userId })

	connection.onmessage = (event) => {
		let message = JSON.parse(event.data)
		handleMessage(message)
	}

	connection.onclose = () => {
		delete users[user.userId]
		sendUpdatedUserList()
	}
});

const messageHandlers = {
	[messageTypes.join]: handleJoin,
}

function handleMessage(message) {
	let handler = messageHandlers[message.type]

	if (handler) {
		handler(message)
	} else if (message.senderId && message.recipientId) {
		let recipient = users[message.recipientId]
		sendToUser(recipient, message)
	}
}

function handleJoin(message) {
	let user = users[message.senderId]

	users[message.senderId] = {
		...user,
		userName: message.userName
	}

	sendUpdatedUserList()
}

function sendUpdatedUserList() {
	sendToAllUsers({
		type: messageTypes.userList,
		users: getUserList()
	})
}

function getUserList() {
	return Object.values(users).map(user => ({
		userName: user.userName,
		userId: user.userId
	}))
}

function sendToUser(user, message) {
	user.connection.send(JSON.stringify(message))
}

function sendToAllUsers(message) {
	Object.values(users).forEach(user => user.connection.send(JSON.stringify(message)))
}
