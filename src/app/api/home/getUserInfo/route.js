import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import formatThousands from 'format-thousands';

export async function GET(req) {
  const cookies = req.headers.get('cookie');
  const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    var userData = await db.query('SELECT * FROM user WHERE id = ?', [decoded.id]);
    userData = userData[0][0]; // Extract the first row from the result

    var activityData = await db.query('SELECT * FROM activity WHERE userId = ?', [decoded.id]);
    activityData = activityData[0]; // Extract the first row from the result

    var totalTokenSent = await db.query('SELECT COALESCE(SUM(token_sent), 0) AS TotalTokenSent FROM activity WHERE userId = ?', [decoded.id]);
    totalTokenSent = totalTokenSent[0][0].TotalTokenSent || 0; // Extract the value from the result

    var totalTokenReceived = await db.query('SELECT COALESCE(SUM(token_received), 0) AS TotalTokenReceived FROM activity WHERE userId = ?', [decoded.id]); // Extract the value from the result
    totalTokenReceived = totalTokenReceived[0][0].TotalTokenReceived || 0;

    var totalCost = await db.query(` SELECT ROUND(
        IFNULL(SUM(token_sent * rate_per_sent + token_received * rate_per_received), 0) ,2) AS total_cost
        FROM activity 
        WHERE userId = ?
    `, [decoded.id]);
    totalCost = totalCost[0][0].total_cost; // Extract the first row from the result

    var totalAPICalls = await db.query('SELECT COUNT(*) AS total_api_calls FROM activity WHERE userId = ?', [decoded.id]);
    totalAPICalls = totalAPICalls[0][0].total_api_calls || 0; // Extract the value from the result

    var monthlyTokenUsage = await db.query(`
      SELECT 
        type,
        SUM(token_sent + token_received) AS totalTokenUsage 
      FROM activity 
      WHERE userId = ? AND MONTH(date) = MONTH(CURRENT_DATE())
      GROUP BY type
    `, [decoded.id]);
    monthlyTokenUsage = monthlyTokenUsage[0] || [];
    monthlyTokenUsage = addColorsToUsage(monthlyTokenUsage); // Add colors to usage data

    var monthlyUsage = await db.query(`SELECT type, COUNT(*) AS totalUsage FROM activity WHERE userId = ? AND MONTH(date) = MONTH(CURRENT_DATE()) GROUP BY type`, [decoded.id]);
    monthlyUsage = monthlyUsage[0] || []; // Extract
    monthlyUsage = addColorsToUsage(monthlyUsage); // Add colors to usage data

    userData = {
      ...userData,
      activity: activityData ? activityData : null,
      totalTokenSent: formatThousands(totalTokenSent, { separator: ',' }),
      totalTokenReceived: formatThousands(totalTokenReceived, { separator: ',' }),
      totalCost: totalCost,
      totalAPICalls: totalAPICalls,
      monthlyTokenUsage: monthlyTokenUsage,
      monthlyUsage: monthlyUsage

    }

    return new Response(JSON.stringify({ userData }), { status: 200 });
  } catch (error) {
    console.error('Token verification failed:', error);
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}


function addColorsToUsage(monthlyUsageData) {
  const colorMap = {
    'Document': '#3366FF',
    'Inclass Notes': '#5A83B8',
    'Textbook Explainer': '#6A5ACD',
    'TTS with Subtitles': '#4A60DE',
    'Image Generation': '#8AD3CC',
    'Chat with AI': '#7796C7',
  };

  return monthlyUsageData.map(item => ({
    ...item,
    color: colorMap[item.type] || '#CCCCCC' // Default gray if no match
  }));
}