import { serialize } from 'cookie';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { queryWithRetry } from '@/lib/queryWithQuery';

export async function POST(req) {
  const { username, password } = await req.json();

  const queryResult = await queryWithRetry('SELECT * FROM user WHERE username = ?', [username]);
  const response = queryResult[0]; // Extract the first row from the result

  if(response.length === 0) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  const isMatch = await bcrypt.compare(password, response[0].password);
  if (!isMatch) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const token = jwt.sign(
    { id: response[0].id, username: response[0].username },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  const serialized = serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 4 // 4 days
  });

  const [dbResult] = await queryWithRetry(`UPDATE user SET last_login = NOW() WHERE id = ?`, [response[0].id]);

  if(dbResult.length === 0){
    return new Response(JSON.stringify({message : "Error logging in. Please try again."}, {status : 400}));
  }

  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': serialized
    }
  });
}

export async function GET(req) {
  const cookies = req.headers.get('cookie');
  const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return new Response(JSON.stringify({ username: decoded.username, userId: decoded.id }), { status: 200 });
    
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}
