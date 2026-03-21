import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { friendships, users } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';

export async function friendRoutes(app: FastifyInstance) {
  // GET /api/friends — list current user's friends
  app.get('/api/friends', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!currentUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // friendships are stored as directed pairs (both directions)
    const rows = await db
      .select({
        friendId: friendships.friendId,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .where(eq(friendships.userId, currentUser.id));

    if (rows.length === 0) {
      return { friends: [] };
    }

    const friendIds = rows.map((r) => r.friendId);

    const friendUsers = await db
      .select({ id: users.id, username: users.username, firstName: users.firstName })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(friendIds.map((id) => sql`${id}`), sql`, `)})`);

    const userMap = new Map(friendUsers.map((u) => [u.id, u]));

    const friends = rows.map((row) => {
      const u = userMap.get(row.friendId);
      return {
        userId: row.friendId,
        username: u?.username ?? null,
        firstName: u?.firstName ?? '',
        since: row.createdAt.toISOString(),
      };
    });

    return { friends };
  });
}
