import { User } from "../model/user.js";
import { Chat } from "../model/chat.js";
import { Message } from "../model/message.js";
import { faker, simpleFaker } from "@faker-js/faker";



// create fake chats
const createSampleSingleChats = async (chatsCount) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                chatsPromise.push(
                    Chat.create({
                        name: faker.lorem.words(2),
                        members: [users[i], users[j]]
                    })
                );
            }
        }
        await Promise.all(chatsPromise);
        console.log("Single chats created successfully");
        process.exit();

    } catch (error) {
        console.log(error);

    }
}

const createSampleGroupChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for (let i = 0; i < numChats; i++) {
            const numMembers = simpleFaker.number.int({ min: 3, max: users.length });

            const members = [];
            for (let j = 0; j < numMembers; j++) {
                const randomIndex = Math.floor(Math.random() * users.length);
                const randomUser = users[randomIndex];

                // ensure that same user is not added twice
                if (!members.includes(randomUser)) {
                    members.push(randomUser);
                }
            }

            const chat = await Chat.create({
                groupChat: true,
                name: faker.lorem.words(1),
                members,
                creator: members[0],
            })

            chatsPromise.push(chat);
        }
        await Promise.all(chatsPromise);

        console.log("chats created", numOfUsers);
        process.exit();

    } catch (error) {
        console.log(error);

    }
}

const createSampleMessage = async ( numMessages) => {
    try {
        const users = await User.find().select('_id');
        const chats = await Chat.find().select('_id');

        const messagePromise = [];
        for(let i = 0; i < numMessages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomChat = chats[Math.floor(Math.random() * chats.length)];

            messagePromise.push(
                Message.create({
                    sender: randomUser,
                    chat: randomChat,
                    content: faker.lorem.sentence()
                })
            )
        }

        await Promise.all(messagePromise);
        console.log("Message created succesfully");
        process.exit();

    } catch (error) {
        console.log(error);
    }
}


const createMessageInChat = async (chatId, numMessages) => {
    try {
        const users = await User.find().select('_id');
        const messagePromise = [];

        for(let i = 0; i < numMessages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];

            messagePromise.push(
                Message.create({
                    sender: randomUser,
                    chat: chatId,
                    content: faker.lorem.sentence()
                })
            )
        }

        await Promise.all(messagePromise);
        console.log("Message created succesfully");
        process.exit();
    } catch (error) {
        console.log(error);
    }
}

export {
    createSampleSingleChats,
    createSampleGroupChats,
    createMessageInChat,
    createSampleMessage
};