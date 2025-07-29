const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class LogGenerator {
    constructor(config = {}) {
        this.logFile = config.logFile || 'app.log';
        this.maxFileSize = config.maxFileSize || 1024 * 1024; // 1MB default
        this.logInterval = config.logInterval || 1000; // 1 second default
        this.format = config.format || 'text'; // 'text' or 'json'
        this.lokiUrl = config.lokiUrl; // Loki push endpoint
        this.lokiLabels = config.lokiLabels || { job: 'log-generator', app: 'demo' };
        this.logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
        this.services = ['auth', 'api', 'database', 'cache', 'payment', 'notification'];
        this.userIds = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010,
                       1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020];
        this.messages = [
            'User login successful',
            'Database connection established',
            'API request processed',
            'Cache miss occurred',
            'Payment transaction completed',
            'Invalid authentication token',
            'Connection timeout',
            'Service unavailable',
            'Request rate limit exceeded',
            'Configuration updated'
        ];
    }

    generateRandomLog() {
        const timestamp = new Date().toISOString();
        const level = this.getWeightedLogLevel();
        const service = this.services[Math.floor(Math.random() * this.services.length)];
        const message = this.messages[Math.floor(Math.random() * this.messages.length)];
        const userId = this.userIds[Math.floor(Math.random() * this.userIds.length)];
        const requestId = Math.random().toString(36).substring(2, 15);
        
        const logData = {
            timestamp,
            level,
            service,
            requestId,
            userId,
            message
        };

        if (this.format === 'json') {
            return {
                entry: JSON.stringify(logData) + '\n',
                data: logData
            };
        } else {
            return {
                entry: `${timestamp} [${level}] [${service}] RequestID: ${requestId} UserID: ${userId} - ${message}\n`,
                data: logData
            };
        }
    }

    getWeightedLogLevel() {
        const random = Math.random() * 100;
        if (random < 60) return 'INFO';      // 60%
        if (random < 70) return 'WARN';      // 10%
        if (random < 90) return 'ERROR';     // 20%
        return 'DEBUG';                      // 10%
    }

    async checkAndTruncateFile() {
        try {
            const stats = await fs.promises.stat(this.logFile);
            if (stats.size > this.maxFileSize) {
                const data = await fs.promises.readFile(this.logFile, 'utf8');
                const lines = data.split('\n');
                const keepLines = Math.floor(lines.length * 0.5); // Keep 50% of logs
                const truncatedData = lines.slice(-keepLines).join('\n');
                await fs.promises.writeFile(this.logFile, truncatedData);
                console.log(`Log file truncated. Kept ${keepLines} lines.`);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error checking file size:', error);
            }
        }
    }

    async writeLog(logEntry, logData = null) {
        try {
            if (this.lokiUrl) {
                // Send to Loki only
                await this.sendToLoki(logEntry, logData);
            } else {
                // Write to file only (default)
                await fs.promises.appendFile(this.logFile, logEntry);
                await this.checkAndTruncateFile();
            }
        } catch (error) {
            console.error('Error writing log:', error);
        }
    }

    async sendToLoki(logEntry, logData) {
        try {
            const timestamp = Date.now() * 1000000; // Loki expects nanoseconds
            const message = logData ? 
                `${logData.level} [${logData.service}] RequestID: ${logData.requestId} UserID: ${logData.userId} - ${logData.message}` :
                logEntry.trim();

            const labels = { 
                ...this.lokiLabels,
                level: logData?.level?.toLowerCase() || 'info',
                service: logData?.service || 'unknown'
            };

            const labelString = Object.entries(labels)
                .map(([key, value]) => `${key}="${value}"`)
                .join(',');

            const payload = {
                streams: [{
                    stream: labels,
                    values: [[timestamp.toString(), message]]
                }]
            };

            const data = JSON.stringify(payload);
            const url = new URL(this.lokiUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            return new Promise((resolve, reject) => {
                const req = httpModule.request(options, (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Loki request failed with status: ${res.statusCode}`));
                    }
                });

                req.on('error', reject);
                req.write(data);
                req.end();
            });
        } catch (error) {
            console.error('Error sending to Loki:', error);
        }
    }

    start() {
        console.log(`Starting log generator...`);
        if (this.lokiUrl) {
            console.log(`Output: Loki streaming`);
            console.log(`Loki endpoint: ${this.lokiUrl}`);
            console.log(`Loki labels: ${JSON.stringify(this.lokiLabels)}`);
        } else {
            console.log(`Output: File logging`);
            console.log(`Log file: ${this.logFile}`);
            console.log(`Max file size: ${this.maxFileSize} bytes`);
        }
        console.log(`Format: ${this.format}`);
        console.log(`Base log interval: ${this.logInterval / 1000} seconds (randomized ±1-2 seconds)`);
        
        this.scheduleNextLog();
    }

    scheduleNextLog() {
        // Use base interval with random variation of ±1-2 seconds
        const variation = (Math.random() - 0.5) * 4000; // -2 to +2 seconds
        const randomInterval = Math.max(1000, this.logInterval + variation); // Minimum 1 second
        
        this.timeoutId = setTimeout(async () => {
            const log = this.generateRandomLog();
            await this.writeLog(log.entry, log.data);
            console.log(`Logged: ${log.entry.trim()}`);
            this.scheduleNextLog(); // Schedule the next log
        }, randomInterval);
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            console.log('Log generator stopped.');
        }
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        logFile: 'application.log',
        maxFileSize: 5 * 1024 * 1024, // 5MB default
        logInterval: 5000, // 5 seconds default
        format: 'text' // default format
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--max-file-size':
            case '-s':
                if (i + 1 < args.length) {
                    config.maxFileSize = parseInt(args[i + 1]) * 1024; // Convert KB to bytes
                    i++;
                } else {
                    console.error('Error: --max-file-size requires a value in KB');
                    process.exit(1);
                }
                break;
            case '--log-file':
            case '-f':
                if (i + 1 < args.length) {
                    config.logFile = args[i + 1];
                    i++;
                } else {
                    console.error('Error: --log-file requires a file name');
                    process.exit(1);
                }
                break;
            case '--log-interval':
            case '-i':
                if (i + 1 < args.length) {
                    config.logInterval = parseInt(args[i + 1]) * 1000; // Convert seconds to milliseconds
                    i++;
                } else {
                    console.error('Error: --log-interval requires a value in seconds');
                    process.exit(1);
                }
                break;
            case '--format':
            case '--json':
                if (args[i] === '--json') {
                    config.format = 'json';
                } else if (i + 1 < args.length) {
                    const format = args[i + 1].toLowerCase();
                    if (format === 'json' || format === 'text') {
                        config.format = format;
                        i++;
                    } else {
                        console.error('Error: --format must be "text" or "json"');
                        process.exit(1);
                    }
                } else {
                    console.error('Error: --format requires a value (text or json)');
                    process.exit(1);
                }
                break;
            case '--loki-url':
                if (i + 1 < args.length) {
                    config.lokiUrl = args[i + 1];
                    i++;
                } else {
                    console.error('Error: --loki-url requires a URL');
                    process.exit(1);
                }
                break;
            case '--loki-labels':
                if (i + 1 < args.length) {
                    try {
                        config.lokiLabels = JSON.parse(args[i + 1]);
                        i++;
                    } catch (error) {
                        console.error('Error: --loki-labels requires valid JSON');
                        process.exit(1);
                    }
                } else {
                    console.error('Error: --loki-labels requires JSON labels');
                    process.exit(1);
                }
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: node log-generator.js [options]

Options:
  -s, --max-file-size <size>  Maximum log file size in KB (default: 5120, file mode only)
  -f, --log-file <file>       Log file name (default: application.log, file mode only)
  -i, --log-interval <sec>    Base log interval in seconds (default: 5)
      --format <format>       Output format: text or json (default: text)
      --json                  Shorthand for --format json
      --loki-url <url>        Loki push endpoint URL (enables Loki streaming mode)
      --loki-labels <json>    Additional Loki labels as JSON (Loki mode only)
  -h, --help                  Show this help message

Output Modes (mutually exclusive):
  Default: Write logs to file (--log-file option)
  Loki:    Stream logs to Loki (--loki-url option)

Note: Actual log intervals are randomized between 1-3 seconds around the base interval.

Examples:
  # File mode (default)
  node log-generator.js --max-file-size 2048 --log-file my-app.log
  node log-generator.js -s 500 -f server.log -i 3 --json
  
  # Loki streaming mode
  node log-generator.js --loki-url http://localhost:3100/loki/api/v1/push
  node log-generator.js --loki-url http://loki:3100/loki/api/v1/push --loki-labels '{"env":"prod","region":"us-west"}'
                `);
                process.exit(0);
            default:
                if (args[i].startsWith('-')) {
                    console.error(`Error: Unknown option ${args[i]}`);
                    console.error('Use --help for usage information');
                    process.exit(1);
                }
        }
    }

    return config;
}

// Configuration
const config = parseArgs();

// Create and start the log generator
const logger = new LogGenerator(config);
logger.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Stopping log generator...');
    logger.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Stopping log generator...');
    logger.stop();
    process.exit(0);
});

module.exports = LogGenerator;
