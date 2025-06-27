import { serialize } from 'cookie';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function POST(req) {
  const { username, password } = await req.json();

  const queryResult = await db.query('SELECT * FROM user WHERE username = ?', [username]);
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
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 4 // 4 days
  });

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
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}
