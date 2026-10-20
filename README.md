# PulseFlow

**Reliable Event Processing & Webhook Infrastructure**

PulseFlow is a backend engineering project focused on building a reliable event-processing system that handles duplicate webhook deliveries, asynchronous processing, retries, and worker failures.

The goal is to ensure that repeated delivery of an event does not result in duplicate business effects.

> **Status:** In development — initial setup and implementation are in progress.

## Problem Statement

External systems may deliver the same webhook more than once. Workers can also crash while processing events, causing messages to be redelivered.

PulseFlow aims to handle these situations safely using database constraints, idempotent processing, message queues, and controlled retries.

## Planned Technology Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **Message Broker:** RabbitMQ
- **Coordination and Caching:** Redis
- **Frontend:** React
- **Testing:** Automated API and integration tests
- **Environment:** Docker and Docker Compose

## Planned Architecture

```text
External Provider
       |
       v
Webhook API (Express)
       |
       v
PostgreSQL Event Inbox
       |
       v
RabbitMQ Queue
       |
       v
Worker Pool
       |
       v
Idempotent Business Processing
       |
       v
PostgreSQL

Redis will be introduced where useful for temporary coordination and other fast operations.

## Planned Features

- Webhook ingestion and input validation
- Duplicate-event detection
- Idempotent business processing
- Asynchronous processing with RabbitMQ
- Worker acknowledgements and redelivery handling
- Retry policies and dead-letter queue (DLQ)
- Failure recovery and safe event replay
- Event status and processing-attempt tracking
- Monitoring dashboard
- Automated testing and Docker-based setup

## Development Roadmap

- [ ] Initialize the project and configure the development environment
- [ ] Build the Express API
- [ ] Connect PostgreSQL and implement the event schema
- [ ] Implement duplicate-event handling
- [ ] Integrate RabbitMQ and background workers
- [ ] Add idempotent business processing
- [ ] Implement retries and dead-letter handling
- [ ] Introduce Redis where needed
- [ ] Add automated failure and concurrency tests
- [ ] Build a React dashboard
- [ ] Document architecture decisions and measured benchmarks

## Engineering Principles

- At-least-once message delivery with idempotent consumers
- PostgreSQL as the durable source of truth
- Explicit handling of failures and retries
- Database constraints to protect data integrity
- Testing under duplicate deliveries and concurrent requests
- Honest, reproducible performance measurements

The goal is not to claim exactly-once message delivery, but to design the system so that duplicate deliveries do not create duplicate business effects.

## Current Status

This repository is being developed incrementally. Features will be marked as implemented only after they have been built and tested.

## License

License to be decided.
