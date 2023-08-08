const bcrypt = require('bcrypt'); // For password hashing
const saltRounds = 10; // Salt rounds for bcrypt
const mongoose = require('mongoose');
const { connectDB, User } = require('./db'); // Import the connectDB function

// Call the connectDB function to establish the MongoDB connection
connectDB();

async function userLogin(email, password) {

    const lowercaseEmail = email.toLowerCase();

    try {
        // Find the user by email in the database
        const user = await User.findOne({ email });

        // If the user is not found, show an error message
        if (!user) {
            return {
                statusCode: 401,
                message: "Inavlid email or password"
            };
        }

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            // If the passwords don't match, show an error message
            return {
                statusCode: 401,
                message: "Invalid email or password"
            };
        }

        return {
            statusCode: 200,
            message: "login successful"
        }

    } catch (error) {
        console.error('Error logging in:', error);
        return {
            statusCode: 500,
            message: 'Internal Server Error',
        };
    }
}

module.exports = {
    userLogin,
};