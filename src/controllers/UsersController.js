// class UserController {
//     /* 
//         - `index` - GET to list multiple records.
//         - `show` - GET to display a specific record.
//         - `create` - POST to create a record.
//         - `update` - PUT to update a record.
//         - `delete` - DELETE to remove a record.  
//     */

//     async create(request, response){
//         const { name, email, password } = request.body;

//         response.status(201).json({ name, email, password }); //status code is not required, must be used following the standard.
//     }    

// }

// module.exports = UserController;
const { hash, compare } = require("bcryptjs");
const AppError = require("../utils/AppError");
const sqliteConnection = require("../database/sqlite");

class UsersController {

    async create( request, response ){
        const { name, email, password } = request.body;

        const database = await sqliteConnection();

        const checkIfUserExists = await database.get("SELECT email FROM users WHERE email = (?)", [email]);

        if(checkIfUserExists){
            throw new AppError("The email is already in use!");
        };

        const hashedPassword = await hash( password, 8 );

        database.run("INSERT INTO users ( name, email, password ) VALUES ( ?, ?, ? )", [ name, email, hashedPassword ]);

        return response.status(201).json();
    };
    async update( request, response ){
        const { name, email, password, old_password } = request.body;
        const { id } = request.params;

        const database = await sqliteConnection();

        const user = await database.get("SELECT * FROM users WHERE id = (?)", [id]);

        if(!user){
            throw new AppError("User not found!");
        };

        const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id){
            throw new AppError("This email is already in use!");
        };

        if(user.name === name && user.email === email){
            throw new AppError("Data already registered!");
        };//In case the user tries to insert the same data that is registered there was no error returned, I inserted this code to compare with the final code later.

        user.name = name;
        user.email = email;

        if(password && !old_password){
            throw new AppError("You need to enter the old password to set the new password.");
        };

        
        if(password && old_password){
            const checkOldPassword = await compare(old_password, user.password);

            if(!checkOldPassword){
                throw new AppError("The old password does not match.");
            };

            user.password = await hash (password, 8);
        };

        await database.run(`
            UPDATE users SET
                name = ?,
                email = ?,
                password = ?,
                updated_at = ?
                WHERE id = ?
                `,
            [ user.name, user.email, user.password, new Date(), id ]
        );

        return response.json(); //here the status is not necessary, by default response.json() will return it
    };
};

module.exports = UsersController;