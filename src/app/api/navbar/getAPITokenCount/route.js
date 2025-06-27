import { db } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(req) {

  const cookies = req.headers.get("cookie");
  const token = cookies ? cookies.split("; ").find(row => row.startsWith("token=")).split("=")[1] : null;
  
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  } else {
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const documentTokenCount = await db.query(
          `SELECT SUM(token_sent + token_received) AS tokenCount FROM activity WHERE userId = ? AND type = ?`, [decoded.id, type]);

        const tokenCount = documentTokenCount[0][0].tokenCount || 0; // Extract the value from the result

        return new Response(JSON.stringify({ tokenCount }), { status: 200 });
    } catch (error) {
        console.error("Error fetching token count:", error);
      return new Response(JSON.stringify({ error: "Server Error." }), { status: 500 });
    }
  }
}