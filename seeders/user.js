//  creating fake user

import { faker } from "@faker-js/faker";
import { User } from "../model/user.js";

const createUser = async (numOfUsers) => {
    try {
        const usersPromise = [];

        for (let i = 0; i < numOfUsers; i++) {

            const tempUser = User.create({
                name: faker.person.fullName(),
                username: faker.internet.userName(),
                bio: faker.lorem.sentence(10),
                password: "password",
                avatar: {
                    url: faker.image.avatar(),
                    public_id: faker.system.fileName()
                }
            });

            usersPromise.push(tempUser);

            await Promise.all(usersPromise);
            console.log("users created", numOfUsers);
            process.exit(1);
        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

// createUser(10);





export {
    createUser
};
