#!/usr/bin/env node

/**
 * External cron job to check for pending reminders
 * This can be run by external schedulers (cron, GitHub Actions, etc.)
 */

const https = require('https');
const http = require('http');

const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || 'http://localhost:3001';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function checkReminders() {
  try {
    console.log('🔄 Checking for pending reminders...');
    
    const data = JSON.stringify({
      type: 'check_reminders',
      secret: WEBHOOK_SECRET,
      timestamp: new Date().toISOString()
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const url = new URL(BOT_WEBHOOK_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Reminder check completed successfully');
        } else {
          console.error('❌ Reminder check failed:', res.statusCode, responseData);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });

    req.write(data);
    req.end();
    
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
}

// Run immediately if called directly
if (require.main === module) {
  checkReminders();
}

module.exports = { checkReminders };

