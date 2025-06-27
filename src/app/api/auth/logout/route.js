import { serialize } from 'cookie';

export async function POST(req) {
  const serialized = serialize('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });

  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': serialized
    }
  });
}
