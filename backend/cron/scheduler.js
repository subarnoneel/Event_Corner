import cron from 'node-cron';
import { performSystemWideBulkCrawl } from '../services/crawler.service.js';
import { checkEventDeadlines } from '../services/event.service.js';

export const initScheduler = () => {
    
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Triggering daily bulk crawl job...');
        await performSystemWideBulkCrawl();
    });

    
    cron.schedule('0 * * * *', async () => {
        console.log('⏳ Triggering hourly deadline check...');
        await checkEventDeadlines();
    });

    console.log('📅 Scheduler initialized: Auto-crawl (00:00 daily) & Deadline Check (every hour).');
};
