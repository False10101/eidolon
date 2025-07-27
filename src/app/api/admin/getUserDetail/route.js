import { queryWithRetry } from "@/lib/queryWithQuery";
import jwt from 'jsonwebtoken';

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const allUsageTypes = [
    'Document',
    'Inclass Notes',
    'Textbook Explainer',
    'TTS with Subtitles',
    'Image Generation',
    'Chat with AI',
];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        const { searchParams } = new URL(req.url);
        const target_id = searchParams.get('id');

        const [adminResult] = await queryWithRetry(`SELECT type FROM user WHERE id = ?`, [user_id]);

        if (adminResult[0]?.type !== 'admin') {
            return new Response(JSON.stringify({ message: "You do not have permission to fetch this request." }), { status: 403 });
        }

        const [
            [activityData],
            [dbUsageData],
            [userData],
            [dailyData]
        ] = await Promise.all([
            queryWithRetry(`SELECT id, title, type, date FROM activity WHERE user_id = ? ORDER BY date DESC`, [target_id]),
            queryWithRetry(`
                SELECT
                    type,
                    SUM(token_sent + token_received) AS tokenCount,
                    COUNT(*) AS callCount
                FROM
                    activity
                WHERE
                    user_id = ?
                GROUP BY
                    type
            `, [target_id]),
            queryWithRetry(`SELECT id, username, created_at, storage_usage FROM user WHERE id = ?`, [target_id]),
            queryWithRetry(`
                SELECT
                    DATE(date) as date,
                    SUM(token_sent + token_received) as token_received
                FROM activity
                WHERE user_id = ?
                GROUP BY DATE(date)
                ORDER BY DATE(date) ASC
                LIMIT 7
            `, [target_id])
        ]);

        const usageMap = new Map();
        allUsageTypes.forEach(type => {
            usageMap.set(type, { type, tokenCount: 0, callCount: 0 });
        });

        dbUsageData.forEach(item => {
            usageMap.set(item.type, {
                type: item.type,
                tokenCount: parseInt(item.tokenCount, 10) || 0,
                callCount: item.callCount
            });
        });

        const fullUsageData = Array.from(usageMap.values());

        const responsePayload = {
            activityList: activityData,
            usageData: fullUsageData,
            userData: userData,
            dailyData: dailyData
        };

        return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401 });
        }
        console.error('Error fetching data:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}