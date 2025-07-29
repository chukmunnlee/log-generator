# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js log generator utility that creates realistic application logs for testing and demonstration purposes. The project consists of a single main file with a LogGenerator class.

## Running the Application

```bash
node log-generator.js
```

The application will:
- Generate random log entries every 500ms (configurable)
- Write logs to `application.log` 
- Automatically truncate the log file when it exceeds 50KB
- Stop automatically after 30 seconds (demo mode)

## Architecture

**Single-file structure**: The entire application is contained in `log-generator.js` with:

- `LogGenerator` class: Main functionality for generating and managing logs
- Configuration object: Defines log file, size limits, and intervals
- Demo setup: Creates an instance and runs for 30 seconds

**Key components**:
- `generateRandomLog()`: Creates structured log entries with timestamp, level, service, and message
- `checkAndTruncateFile()`: Manages log file size by keeping 50% of entries when size limit exceeded
- `writeLog()`: Handles file writing with error handling
- `start()/stop()`: Controls the log generation interval

**Log format**: `timestamp [LEVEL] [service] RequestID: id UserID: id - message`

**Services simulated**: auth, api, database, cache, payment, notification

## Configuration

Modify the config object in `log-generator.js`:
- `logFile`: Output file name (default: 'application.log')
- `maxFileSize`: File size limit in bytes (default: 50KB)
- `logInterval`: Time between log entries in ms (default: 500ms)