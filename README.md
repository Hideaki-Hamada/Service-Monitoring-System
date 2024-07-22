# Setting Up a Monitoring System Using Grafana and Prometheus

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Setup Instructions](#setup-instructions)
4. [Configuration Details](#configuration-details)
5. [Running the System](#running-the-system)
6. [Project Layout](#project-layout)
7. [How to Contribute](#how-to-contribute)
8. [License Information](#license-information)

## Overview

- **Prometheus**:
Prometheus is a monitoring and alerting toolkit designed primarily for reliability and scalability. Developed originally by SoundCloud, Prometheus collects and stores its metrics as time series data, recording information with a timestamp, optional key-value pairs (labels), and metric names. It uses a powerful query language called PromQL to retrieve and analyze this data. Prometheus is particularly well-suited for dynamic cloud environments, where it can scrape metrics from configured targets, such as applications and services, typically via HTTP endpoints. It also includes features for defining alert rules, which can trigger notifications through integrations with various alert manager tools. Overall, Prometheus is a robust solution for real-time monitoring and alerting in complex, cloud-native infrastructure.
- **Grafana**:
Grafana is a platform for monitoring and observability that excels in visualizing metrics, logs, and traces collected from various data sources. It allows users to create interactive and customizable dashboards to gain insights into system performance, application health, and operational data. Grafana supports a wide range of data sources, including Prometheus, InfluxDB, Elasticsearch, and more, enabling seamless integration into existing monitoring setups. Users can leverage its powerful query editor to construct complex queries, create alerts, and set up dynamic panels that update in real-time. With its intuitive interface and extensive plugin ecosystem, Grafana is a versatile tool for monitoring, troubleshooting, and optimizing IT infrastructure and applications.
- **Node.js**:
Node.js is a cross-platform JavaScript runtime environment that allows developers to run JavaScript on the server side. Built on Chrome's V8 JavaScript engine, Node.js is designed for building scalable and high-performance network applications. It employs an event-driven, non-blocking I/O model, making it lightweight and efficient, particularly suitable for data-intensive real-time applications. Node.js has a rich ecosystem of libraries and modules available through npm (Node Package Manager), enabling developers to quickly implement a wide range of functionalities. Its ability to handle numerous simultaneous connections with high throughput makes it ideal for applications such as web servers, API services, and microservices architectures.
- **Docker and Docker-Compose**:
Docker is a platform that automates the deployment, scaling, and management of applications by using containerization technology. Containers package an application and its dependencies into a single, portable unit that can run consistently across various computing environments, from development to production. Docker containers are lightweight and provide isolated environments for applications, ensuring that software runs the same regardless of where it is deployed. This isolation also enhances security and resource efficiency. Docker includes tools for building container images, managing container lifecycle, and orchestrating multi-container applications through Docker Compose and Docker Swarm. By simplifying application deployment and management, Docker helps streamline development workflows and improve the consistency and reliability of software delivery.

## Requirements

- Docker
- Docker-Compose
- Git

## Setup Instructions

### Install Docker and Docker-Compose

1. **Docker Installation:**
    ```bash
    sudo apt update
    sudo apt upgrade
    sudo apt install docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    ```

2. **Docker-Compose Installation:**
    ```bash
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    docker-compose --version
    ```

3. **Verify Installations:**
    ```bash
    docker --version
    docker-compose --version
    ```

### Clone the Repository

1. **Clone from GitHub:**
    ```bash
    git clone git@github.com:Jose05102/Grafana-and-Prometheus-for-Monitoring-a-system.git
    cd Grafana-and-Prometheus-for-Monitoring-a-system
    ```

## Configuration Details

### Prometheus Configuration

1. **`prometheus.yml` file:**
    ```yaml
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: "prometheus"
        static_configs:
          - targets: ["localhost:9090"]

      - job_name: "cadvisor"
        static_configs:
          - targets: ["cadvisor:8080"]

      - job_name: "node_exporter"
        static_configs:
          - targets: ["node_exporter:9100"]

      - job_name: "node_app"
        static_configs:
          - targets: ["node-app:3000"]
    ```

2. **Docker Compose Configuration:**
    ```yaml
    version: '3'
    services:
      prometheus:
        image: prom/prometheus
        volumes:
          - ./prometheus:/etc/prometheus
        command:
          - '--config.file=/etc/prometheus/prometheus.yml'
        ports:
          - "9090:9090"
        networks:
          - docker-net
    ```

### Grafana Configuration

1. **Add Grafana to Docker Compose:**
    ```yaml
    grafana:
      image: grafana/grafana
      ports:
        - "3001:3000"
      networks:
        - docker-net
    ```

2. **Prometheus Data Source Configuration in Grafana:**
    - Navigate to **Configuration > Data Sources** in Grafana.
    - Select **Add data source** and choose **Prometheus**.
    - Set the Prometheus URL to `http://prometheus:9090`.

### Integrating with Node.js

1. **Node.js Application Code with Metrics:**
    ```javascript
    const express = require('express');
    const bodyParser = require('body-parser');
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const client = require('prom-client');

    const app = express();
    const port = 3000;

    // SQLite database configuration
    const dbPath = path.join(__dirname, 'registro_db.sqlite3');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to the database:', err.message);
            return;
        }
        console.log('Connected to the SQLite database');
    });

    // Create table if not exists
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            favoriteColor TEXT NOT NULL,
            favoriteSeries TEXT NOT NULL
        )`);
    });

    // Middleware
    app.use(bodyParser.json());
    app.use(express.static('public'));

    // Expose Prometheus metrics
    const register = new client.Registry();
    const httpRequestsTotal = new client.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'code']
    });
    register.registerMetric(httpRequestsTotal);

    app.use((req, res, next) => {
        res.on('finish', () => {
            httpRequestsTotal.inc({
                method: req.method,
                route: req.path,
                code: res.statusCode
            });
        });
        next();
    });

    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    // Route to register data
    app.post('/register', (req, res) => {
        const { fullName, favoriteColor, favoriteSeries } = req.body;
        const query = 'INSERT INTO users (fullName, favoriteColor, favoriteSeries) VALUES (?, ?, ?)';

        db.run(query, [fullName, favoriteColor, favoriteSeries], function(err) {
            if (err) {
                console.error('Error registering data:', err.message);
                return res.status(500).json({ message: 'Error registering data' });
            }
            res.json({ message: 'Data successfully registered', id: this.lastID });
        });
    });

    // Route to get data
    app.get('/data', (req, res) => {
        const query = 'SELECT * FROM users';
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching data:', err.message);
                return res.status(500).json({ message: 'Error fetching data' });
            }
            res.json(rows);
        });
    });

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
    ```

## Running the System

1. **Launch Docker Compose:**
    ```bash
    sudo docker network create docker-net
    docker-compose up --build
    ```

2. **Verify Prometheus Targets:**
    - Visit `http://localhost:9090/targets` to ensure all targets are `UP`.

3. **Create Grafana Dashboards:**
    - Access Grafana at `http://localhost:3001`.
    - Create new dashboards and panels to visualize metrics like `http_requests_total`.
