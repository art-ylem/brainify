import { db } from './index.js';
import { tasks } from './schema.js';
import { taskRegistry } from '@brainify/shared';

export async function seedTasks() {
  const entries = Object.entries(taskRegistry);

  const result = await db
    .insert(tasks)
    .values(
      entries.map(([key, def]) => ({
        type: key as typeof tasks.$inferInsert.type,
        category: def.category as typeof tasks.$inferInsert.category,
        name: def.nameKey,
        descriptionKey: def.descriptionKey,
      })),
    )
    .onConflictDoNothing()
    .returning();

  console.log(`Seeded ${result.length} tasks (${entries.length - result.length} already existed)`);
}
