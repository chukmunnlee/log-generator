# Log Generator

A Node.js application that generates realistic application logs with configurable options. Perfect for testing log aggregation systems, monitoring tools, and creating demo environments.

## Features

- **Realistic log generation** with structured entries including timestamps, log levels, services, and user IDs
- **Weighted log level distribution**: INFO (60%), WARN (10%), ERROR (20%), DEBUG (10%)
- **Multiple output modes**: File logging (default) or Loki streaming
- **Configurable parameters**: File size limits, intervals, output formats
- **JSON and text formats** supported
- **Docker support** with pre-built images
- **Automatic file rotation** when size limits are exceeded
- **Graceful shutdown** handling

## Quick Start

### Using Docker (Recommended)

```bash
# Run with default settings (writes to /app/logs/application.log)
docker run --rm -v $(pwd)/logs:/app/logs ghcr.io/chukmunnlee/log-generator:latest

# Run with custom settings
docker run --rm -v $(pwd)/logs:/app/logs ghcr.io/chukmunnlee/log-generator:latest \
  node log-generator.js --max-file-size 2048 --log-interval 3 --json

# Stream to Loki (no file output)
docker run --rm ghcr.io/chukmunnlee/log-generator:latest \
  node log-generator.js --loki-url http://loki:3100/loki/api/v1/push
```

### Using Node.js

```bash
# Clone the repository
git clone https://github.com/chukmunnlee/log-generator.git
cd log-generator

# Run with default settings
node log-generator.js

# Run with custom options
node log-generator.js --max-file-size 1024 --log-file my-app.log --json
```

## Usage

### Command Line Options

```
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
```

### Output Modes

The application supports two mutually exclusive output modes:

#### File Mode (Default)
Writes logs to a local file with automatic rotation:
```bash
node log-generator.js --log-file app.log --max-file-size 1024
```

#### Loki Streaming Mode
Streams logs directly to a Loki instance:
```bash
node log-generator.js --loki-url http://localhost:3100/loki/api/v1/push
```

### Examples

#### Basic file logging
```bash
# Generate logs to application.log (default)
node log-generator.js

# Custom file with 2MB limit, JSON format
node log-generator.js --log-file server.log --max-file-size 2048 --json

# Fast generation (2-second intervals)
node log-generator.js --log-interval 2
```

#### Docker examples
```bash
# File logging with volume mount
docker run --rm -v $(pwd)/logs:/app/logs ghcr.io/chukmunnlee/log-generator:latest

# JSON format with custom settings
docker run --rm -v $(pwd)/logs:/app/logs ghcr.io/chukmunnlee/log-generator:latest \
  node log-generator.js --json --log-interval 3 --max-file-size 1024

# Stream to external Loki
docker run --rm --network host ghcr.io/chukmunnlee/log-generator:latest \
  node log-generator.js --loki-url http://localhost:3100/loki/api/v1/push
```

#### Loki streaming
```bash
# Basic Loki streaming
node log-generator.js --loki-url http://localhost:3100/loki/api/v1/push

# With custom labels
node log-generator.js \
  --loki-url http://loki:3100/loki/api/v1/push \
  --loki-labels '{"env":"production","region":"us-west","team":"backend"}'
```

## Docker Images

Pre-built Docker images are available from GitHub Container Registry:

- **Latest**: `ghcr.io/chukmunnlee/log-generator:latest`
- **Versioned**: `ghcr.io/chukmunnlee/log-generator:v1.0.0`

### Image Verification

Images are signed with cosign. Verify using the included public key:

```bash
# Download the public key
curl -O https://raw.githubusercontent.com/chukmunnlee/log-generator/master/cosign.pub

# Verify the image signature
cosign verify --key cosign.pub ghcr.io/chukmunnlee/log-generator:latest
```

## Log Format

### Text Format (Default)
```
2024-01-15T10:30:45.123Z [INFO] [api] RequestID: abc123def456 UserID: 1005 - API request processed
2024-01-15T10:30:47.891Z [ERROR] [database] RequestID: xyz789uvw012 UserID: 1012 - Connection timeout
```

### JSON Format
```json
{"timestamp":"2024-01-15T10:30:45.123Z","level":"INFO","service":"api","requestId":"abc123def456","userId":1005,"message":"API request processed"}
{"timestamp":"2024-01-15T10:30:47.891Z","level":"ERROR","service":"database","requestId":"xyz789uvw012","userId":1012,"message":"Connection timeout"}
```

## Log Characteristics

- **Services**: auth, api, database, cache, payment, notification
- **User IDs**: Fixed pool of 20 users (1001-1020)
- **Log Levels**: INFO (60%), WARN (10%), ERROR (20%), DEBUG (10%)
- **Intervals**: Randomized around base interval (±1-2 seconds)
- **Request IDs**: Randomly generated alphanumeric strings

## Docker Compose Example

```yaml
version: '3.8'
services:
  log-generator:
    image: ghcr.io/chukmunnlee/log-generator:latest
    command: node log-generator.js --json --log-interval 2
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  # Example with Loki streaming
  log-generator-loki:
    image: ghcr.io/chukmunnlee/log-generator:latest
    command: node log-generator.js --loki-url http://loki:3100/loki/api/v1/push --json
    depends_on:
      - loki
    restart: unless-stopped

  # Loki log aggregation system
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki-data:/loki
    restart: unless-stopped

  # Grafana for viewing logs (optional)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  loki-data:
  grafana-data:
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/chukmunnlee/log-generator.git
cd log-generator

# Build Docker image
docker build -t log-generator .

# Run locally
node log-generator.js --help
```

## Use Cases

- **Testing log aggregation systems** (ELK, Loki, Splunk)
- **Monitoring tool demos** and testing
- **Load testing** log processing pipelines
- **Development environments** requiring realistic log data
- **Training and workshops** on observability tools

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is open source and available under the MIT License.