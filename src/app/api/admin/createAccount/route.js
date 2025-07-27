import { queryWithRetry } from "@/lib/queryWithQuery";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    // 1. Authenticate and Authorize Admin
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET);
        const [adminResult] = await queryWithRetry(`SELECT type FROM user WHERE id = ?`, [decodedAdmin.id]);

        if (!adminResult || adminResult[0]?.type !== 'admin') {
            return new Response(JSON.stringify({ message: "Forbidden: You do not have permission to create an account." }), { status: 403 });
        }

        // 2. Get and Validate New User Data from Request Body
        const { username, password, type } = await req.json();

        if (!username || !password || !type) {
            return new Response(JSON.stringify({ message: 'Missing required fields: username, password, and type are required.' }), { status: 400 });
        }

        // 3. Check if user already exists
        const [existingUser] = await queryWithRetry('SELECT id FROM user WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return new Response(JSON.stringify({ message: 'Username already exists.' }), { status: 409 }); // 409 Conflict
        }

        // 4. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Insert the new user into the database
        const newUser = {
            username,
            password: hashedPassword,
            type, // 'admin' or 'user'
            storage_usage: 0,
            status: 'normal'
        };

        const [insertResult] = await queryWithRetry(
            'INSERT INTO user (username, password, type, created_at, last_login, storage_usage, status) VALUES (?, ?, ?, NOW(), NOW(), ?, ?)',
            [newUser.username, newUser.password, newUser.type, newUser.storage_usage, newUser.status]
        );

        // 6. Return a success response
        return new Response(JSON.stringify({
            message: 'User created successfully',
            newUser: {
                id: insertResult.insertId,
                username: newUser.username,
                type: newUser.type,
            }
        }), {
            status: 200, // 201 Created
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             return new Response(JSON.stringify({ message: 'Unauthorized: Invalid token' }), { status: 401 });
        }
        console.error('Error creating user:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}
