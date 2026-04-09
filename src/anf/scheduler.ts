import { CronExpressionParser } from 'cron-parser';

export interface ScheduledTask {
  agent: string;
  name: string;
  cron: string;
  handler: () => Promise<string>;
}

export function getNextRun(task: ScheduledTask): Date {
  const expression = CronExpressionParser.parse(task.cron);
  return expression.next().toDate();
}

const tasks: ScheduledTask[] = [];
let running = false;

export function registerTask(task: ScheduledTask): void {
  tasks.push(task);
  console.log(
    `[scheduler] Registered: ${task.agent}/${task.name} (${task.cron})`,
  );
}

export function startScheduler(): void {
  if (running) return;
  running = true;
  console.log(`[scheduler] Started with ${tasks.length} tasks`);
  tick();
}

async function tick(): Promise<void> {
  if (!running) return;

  const now = new Date();

  for (const task of tasks) {
    const nextRun = getNextRun(task);
    const diffMs = nextRun.getTime() - now.getTime();
    if (diffMs <= 0 && diffMs > -60_000) {
      console.log(`[scheduler] Running: ${task.agent}/${task.name}`);
      try {
        const result = await task.handler();
        console.log(
          `[scheduler] Done: ${task.agent}/${task.name} — ${result.slice(0, 80)}`,
        );
      } catch (err: any) {
        if (err.message?.includes('Rate limited')) {
          console.warn(
            `[scheduler] Skipped ${task.agent}/${task.name}: ${err.message}`,
          );
        } else {
          console.error(
            `[scheduler] Error: ${task.agent}/${task.name} — ${err.message}`,
          );
        }
      }
    }
  }

  setTimeout(tick, 30_000);
}

export function stopScheduler(): void {
  running = false;
}
