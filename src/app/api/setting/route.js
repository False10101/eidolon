import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { queryWithRetry } from '@/lib/queryWithQuery';


export async function GET(req) {
  try {
    // Extract token from cookies
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    // Get user data
    const [userRows] = await queryWithRetry(
      'SELECT id, username, gemini_api, dall_e_api, murf_api FROM user WHERE id = ? AND status != "deleted"',
      [user_id]
    );

    if (userRows.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const user = userRows[0];

    // Get activity data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [activityData] = await queryWithRetry(`
      SELECT 
        type,
        DATE(date) as date,
        SUM(token_sent) as token_sent,
        SUM(token_received) as token_received,
        COUNT(*) as count
      FROM activity
      WHERE user_id = ? AND date >= ?
      GROUP BY type, DATE(date)
      ORDER BY type, date
    `, [user_id, sevenDaysAgoStr]);

    // Get totals for each activity type
    const [totals] = await queryWithRetry(`
      SELECT 
        type,
        SUM(token_sent) as total_token_sent,
        SUM(token_received) as total_token_received,
        COUNT(*) as total_count
      FROM activity
      WHERE user_id = ?
      GROUP BY type
    `, [user_id]);

    // Format the response
    const responseData = {
      user,
      activityData: activityData.reduce((acc, row) => {
        if (!acc[row.type]) {
          acc[row.type] = {
            dailyData: [],
            totals: totals.find(t => t.type === row.type) || {
              total_token_sent: 0,
              total_token_received: 0,
              total_count: 0
            }
          };
        }
        acc[row.type].dailyData.push({
          date: row.date,
          token_sent: row.token_sent,
          token_received: row.token_received,
          count: row.count
        });
        return acc;
      }, {})
    };

    return new Response(JSON.stringify(responseData), { status: 200 });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    // Authentication
    const cookies = req.headers.get('cookie');
    const token = cookies?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    // Parse request body (only API keys)
    const { gemini_api, dall_e_api, murf_api } = await req.json();

    // Build update query
    const updates = [];
    const params = [];

    if (gemini_api !== undefined) {
      updates.push('gemini_api = ?');
      params.push(gemini_api);
    }
    if (dall_e_api !== undefined) {
      updates.push('dall_e_api = ?');
      params.push(dall_e_api);
    }
    if (murf_api !== undefined) {
      updates.push('murf_api = ?');
      params.push(murf_api);
    }

    // Execute update if there are changes
    if (updates.length > 0) {
      params.push(user_id);
      await queryWithRetry(
        `UPDATE user SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('API Keys Update Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}

// New endpoint for password changes
export async function PATCH(req) {
  try {
    // Authentication
    const cookies = req.headers.get('cookie');
    const token = cookies?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    // Parse request body
    const { currentPassword, newPassword } = await req.json();

    // Validate request
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Both current and new password are required' }), { status: 400 });
    }

    // Get current password hash
    const [user] = await queryWithRetry(
      'SELECT password FROM user WHERE id = ?',
      [user_id]
    );

    if (user.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user[0].password);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), { status: 401 });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await queryWithRetry(
      'UPDATE user SET password = ? WHERE id = ?',
      [hashedPassword, user_id]
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Password Update Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}


export async function DELETE(req) {
  try {
    const cookies = req.headers.get('cookie');
    const token = cookies?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    // Soft delete - set status to 'deleted' and clear sensitive data
    await queryWithRetry(`
      UPDATE user SET 
        status = 'deleted',
        gemini_api = NULL,
        dall_e_api = NULL,
        murf_api = NULL,
        password = '[deleted]'
        WHERE id = ?
    `, [user_id]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('DELETE Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}