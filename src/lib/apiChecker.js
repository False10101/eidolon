import { queryWithRetry } from "./queryWithQuery"

export async function checkAPI(user_id, type){
    const [dbResult] = await queryWithRetry(
        `SELECT ${type}_api FROM user WHERE id = ?`,
        [user_id]
    );

    if (!dbResult || !dbResult[0] || !dbResult[0][`${type}_api`]) {
        return false;
    }

    return true;
}