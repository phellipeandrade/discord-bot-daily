import { Client, TextChannel } from 'discord.js';
import * as cron from 'node-cron';
import { isHoliday } from './holidays';
import { i18n } from './i18n';
import {
  CHANNEL_ID,
  TIMEZONE,
  DAILY_TIME,
  DAILY_DAYS,
  HOLIDAY_COUNTRIES,
  DISABLED_UNTIL
} from './config';
import { loadUsers, selectUser } from './users';
import { findNextSong } from './music';
import { todayISO } from './date';

let dailyJob: cron.ScheduledTask | null = null;

export function scheduleDailySelection(client: Client): void {
  if (dailyJob) dailyJob.stop();

  const [hour, minute] = DAILY_TIME.split(':').map((n) => parseInt(n, 10));
  const cronExpr = `${minute} ${hour} * * ${DAILY_DAYS}`;
  console.log(
    `📅 Daily job scheduled at ${DAILY_TIME} (${DAILY_DAYS}) [TZ ${TIMEZONE}]`
  );
  dailyJob = cron.schedule(
    cronExpr,
    async () => {
      if (DISABLED_UNTIL && todayISO() <= DISABLED_UNTIL) {
        console.log(`⏸️ Bot disabled until ${DISABLED_UNTIL}`);
        return;
      }
      if (isHoliday(new Date(), HOLIDAY_COUNTRIES)) {
        console.log(i18n.t('daily.holiday'));
        return;
      }

      const data = await loadUsers();
      const selected = await selectUser(data);

      const { text, components } = await findNextSong(client);

      if (!CHANNEL_ID) {
        console.error('CHANNEL_ID not configured. Skipping daily announcement');
        return;
      }

      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel?.isTextBased()) {
        (channel as TextChannel).send({
          content:
            `${i18n.t('daily.announcement', { id: selected.id, name: selected.name })}\n\n` +
            text,
          components
        });
      }
    },
    { timezone: TIMEZONE }
  );
}
