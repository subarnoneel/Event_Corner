import { performSystemWideBulkCrawl } from './services/crawler.service.js';

console.log("Testing system wide bulk crawl...");
performSystemWideBulkCrawl().then(() => {
    console.log("Test complete.");
    process.exit(0);
}).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
