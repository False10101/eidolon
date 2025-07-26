import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import formatThousands from 'format-thousands';

// NO EXTERNAL DATE LIBRARIES ARE USED

export async function GET(req) {
  const cookies = req.headers.get('cookie');
  const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }


  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // --- All your existing data fetching logic remains unchanged ---
    const ALL_API_TYPES_DEFAULTS = [
      { type: "Document", totalUsage: 0, totalTokenUsage: 0, color: "" },
      { type: "Inclass Notes", totalUsage: 0, totalTokenUsage: 0, color: "" },
      { type: "Textbook Explainer", totalUsage: 0, totalTokenUsage: 0, color: "" },
      { type: "TTS with Subtitles", totalUsage: 0, totalTokenUsage: 0, color: "" },
      { type: "Image Generation", totalUsage: 0, totalTokenUsage: 0, color: "" },
      { type: "Chat with AI", totalUsage: 0, totalTokenUsage: 0, color: "" },
    ];
    var userData = await db.query('SELECT * FROM user WHERE id = ?', [decoded.id]);
    userData = userData[0][0];
    var activityData = await db.query('SELECT * FROM activity WHERE user_id = ? ORDER BY date DESC', [decoded.id]);
    activityData = activityData[0];
    var totalTokenSent = await db.query('SELECT COALESCE(SUM(token_sent), 0) AS TotalTokenSent FROM activity WHERE user_id = ?', [decoded.id]);
    totalTokenSent = totalTokenSent[0][0].TotalTokenSent || 0;
    var totalTokenReceived = await db.query('SELECT COALESCE(SUM(token_received), 0) AS TotalTokenReceived FROM activity WHERE user_id = ?', [decoded.id]);
    totalTokenReceived = totalTokenReceived[0][0].TotalTokenReceived || 0;
    var totalCost = await db.query(` SELECT ROUND(IFNULL(SUM(token_sent * rate_per_sent + token_received * rate_per_received), 0) ,2) AS total_cost FROM activity WHERE user_id = ?`, [decoded.id]);
    totalCost = totalCost[0][0].total_cost;
    var totalAPICalls = await db.query('SELECT COUNT(*) AS total_api_calls FROM activity WHERE user_id = ?', [decoded.id]);
    totalAPICalls = totalAPICalls[0][0].total_api_calls || 0;
    let fetchedMonthlyTokenUsage = await db.query(`SELECT type, SUM(token_sent + token_received) AS totalTokenUsage FROM activity WHERE user_id = ? AND MONTH(date) = MONTH(CURRENT_DATE()) GROUP BY type`, [decoded.id]);
    fetchedMonthlyTokenUsage = fetchedMonthlyTokenUsage[0] || [];
    fetchedMonthlyTokenUsage = addColorsToUsage(fetchedMonthlyTokenUsage);
    const finalMonthlyTokenUsageData = ALL_API_TYPES_DEFAULTS.map(defaultType => {
      const fetched = fetchedMonthlyTokenUsage.find(item => item.type === defaultType.type);
      return { ...defaultType, ...(fetched && { totalTokenUsage: fetched.totalTokenUsage, color: fetched.color }) };
    });
    let fetchedMonthlyUsage = await db.query(`SELECT type, COUNT(*) AS totalUsage FROM activity WHERE user_id = ? AND MONTH(date) = MONTH(CURRENT_DATE()) GROUP BY type`, [decoded.id]);
    fetchedMonthlyUsage = fetchedMonthlyUsage[0] || [];
    fetchedMonthlyUsage = addColorsToUsage(fetchedMonthlyUsage);
    const finalMonthlyUsageData = ALL_API_TYPES_DEFAULTS.map(defaultType => {
      const fetched = fetchedMonthlyUsage.find(item => item.type === defaultType.type);
      return { ...defaultType, ...(fetched && { totalUsage: fetched.totalUsage, color: fetched.color }) };
    });

    // --- FIXED WEEKLY COMPARISON LOGIC (LAST 7 DAYS vs 8-14 DAYS AGO) ---

    // 1. Get stats for the last 7 days (this week).
    const [thisWeekData] = await db.query(`
      SELECT 
        SUM(token_sent) AS thisWeekTokenSent,
        SUM(token_received) AS thisWeekTokenReceived,
        COUNT(*) AS thisWeekAPICalls,
        ROUND(SUM(token_sent * rate_per_sent + token_received * rate_per_received), 2) AS thisWeekCost
      FROM activity 
      WHERE user_id = ? AND date >= NOW() - INTERVAL 7 DAY
    `, [decoded.id]);

    // 2. Get stats for the 7 days before that (8-14 days ago, i.e., last week).
    const [lastWeekData] = await db.query(`
      SELECT 
        SUM(token_sent) AS lastWeekTokenSent,
        SUM(token_received) AS lastWeekTokenReceived,
        COUNT(*) AS lastWeekAPICalls,
        ROUND(SUM(token_sent * rate_per_sent + token_received * rate_per_received), 2) AS lastWeekCost
      FROM activity 
      WHERE 
        user_id = ? AND 
        date >= NOW() - INTERVAL 14 DAY AND
        date < NOW() - INTERVAL 7 DAY
    `, [decoded.id]);
    
    // --- Your original calculation logic remains unchanged ---
    const calculateChange = (current, previous) => {
      if (previous === 0 || previous === null) return current === 0 || current === null ? 0 : 100;
      return Math.round(((current - previous) / previous) * 100);
    };

    const weeklyComparison = {
      tokenSent: {
        current: thisWeekData[0]?.thisWeekTokenSent || 0,
        previous: lastWeekData[0]?.lastWeekTokenSent || 0,
        change: calculateChange(thisWeekData[0]?.thisWeekTokenSent, lastWeekData[0]?.lastWeekTokenSent)
      },
      tokenReceived: {
        current: thisWeekData[0]?.thisWeekTokenReceived || 0,
        previous: lastWeekData[0]?.lastWeekTokenReceived || 0,
        change: calculateChange(thisWeekData[0]?.thisWeekTokenReceived, lastWeekData[0]?.lastWeekTokenReceived)
      },
      apiCalls: {
        current: thisWeekData[0]?.thisWeekAPICalls || 0,
        previous: lastWeekData[0]?.lastWeekAPICalls || 0,
        change: calculateChange(thisWeekData[0]?.thisWeekAPICalls, lastWeekData[0]?.lastWeekAPICalls)
      },
      cost: {
        current: thisWeekData[0]?.thisWeekCost || 0,
        previous: lastWeekData[0]?.lastWeekCost || 0,
        change: calculateChange(thisWeekData[0]?.thisWeekCost, lastWeekData[0]?.lastWeekCost)
      }
    };

    // --- Your original data assembly logic remains unchanged ---
    userData = {
      ...userData,
      weeklyComparison : weeklyComparison,
      activity: activityData ? activityData : null,
      totalTokenSent: formatThousands(totalTokenSent, { separator: ',' }),
      totalTokenReceived: formatThousands(totalTokenReceived, { separator: ',' }),
      totalCost: totalCost,
      totalAPICalls: totalAPICalls,
      monthlyTokenUsage: finalMonthlyTokenUsageData,
      monthlyUsage: finalMonthlyUsageData
    }

    return new Response(JSON.stringify({ userData }), { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Invalid token or server error' }), { status: 401 });
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
    color: colorMap[item.type] || '#CCCCCC'
  }));
}
