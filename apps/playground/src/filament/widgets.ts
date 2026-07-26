import { count, gte, sql } from 'drizzle-orm';
import type { Widget } from '@filamentjs/panels';
import { db } from '~/db/client';
import { posts, user } from '~/db/schema';

// Labels for the last 7 days, oldest first, as YYYY-MM-DD.
function lastSevenDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let back = 6; back >= 0; back--) {
    const day = new Date(today);
    day.setDate(today.getDate() - back);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

async function postsPerDay(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      day: sql<string>`to_char(${posts.createdAt}, 'YYYY-MM-DD')`,
      total: count(),
    })
    .from(posts)
    .where(gte(posts.createdAt, sql`current_date - interval '6 days'`))
    .groupBy(sql`1`);
  return Object.fromEntries(rows.map((row) => [row.day, Number(row.total)]));
}

export const postsCountWidget: Widget = {
  type: 'stat',
  name: 'posts-count',
  title: 'Posts',
  load: async () => {
    const [row] = await db.select({ total: count() }).from(posts);
    const perDay = await postsPerDay();
    return {
      value: Number(row?.total ?? 0),
      description: 'Total posts',
      trend: lastSevenDays().map((day) => perDay[day] ?? 0),
    };
  },
};

export const usersCountWidget: Widget = {
  type: 'stat',
  name: 'users-count',
  title: 'Users',
  load: async () => {
    const [row] = await db.select({ total: count() }).from(user);
    return { value: Number(row?.total ?? 0), description: 'Registered accounts' };
  },
};

export const postsPerDayWidget: Widget = {
  type: 'chart',
  name: 'posts-per-day',
  title: 'Posts per day',
  chart: 'line',
  columnSpan: 2,
  load: async () => {
    const perDay = await postsPerDay();
    const labels = lastSevenDays();
    return { labels, series: [{ name: 'Posts', data: labels.map((day) => perDay[day] ?? 0) }] };
  },
};
