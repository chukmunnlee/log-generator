# Use Node.js 23 as base image
FROM node:23

# Set working directory
WORKDIR /app

# Copy application files
COPY log-generator.js .

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Declare volume for logs
VOLUME /app/logs

SHELL [ "/bin/sh", "-c" ]

# Default command - can be overridden with docker run
CMD ["node", "log-generator.js", "--log-file", "/app/logs/application.log"]
