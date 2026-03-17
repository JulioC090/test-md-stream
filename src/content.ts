// 1000+ lines of rich markdown content to simulate massive AI streaming output
export const MASSIVE_MARKDOWN = `
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**

# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**
# Comprehensive Guide to Modern Software Architecture

## Table of Contents

1. [Introduction](#introduction)
2. [Microservices](#microservices)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Data Patterns](#data-patterns)
5. [Infrastructure](#infrastructure)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing Strategies](#testing-strategies)
9. [Deployment Patterns](#deployment-patterns)
10. [Observability](#observability)

---

## Introduction

Modern software architecture has evolved dramatically over the past decade. What was once a monolithic approach has transformed into **distributed systems** that scale horizontally, handle millions of requests, and provide *fault tolerance* across global regions.

> "The best architectures, requirements, and designs emerge from self-organizing teams."
> — Agile Manifesto

The key principles that guide modern architecture include:

- **Separation of Concerns** — Each component has a single, well-defined responsibility
- **Loose Coupling** — Components interact through well-defined interfaces
- **High Cohesion** — Related functionality is grouped together
- **Resilience** — Systems gracefully handle failures
- **Observability** — Systems are transparent and monitorable

### Why Architecture Matters

Poor architecture leads to:

1. Increased development time
2. Higher bug rates
3. Difficulty scaling
4. Team bottlenecks
5. Technical debt accumulation

Good architecture enables:

1. Rapid feature development
2. Independent team scaling
3. Easy debugging and monitoring
4. Cost-effective scaling
5. Long-term maintainability

---

## Microservices

### What Are Microservices?

Microservices represent an **architectural style** that structures an application as a collection of loosely coupled, independently deployable services. Each service:

- Owns its own data store
- Communicates via well-defined APIs
- Can be deployed independently
- Is organized around business capabilities

### Service Design Patterns

#### API Gateway Pattern

\`\`\`typescript
interface APIGateway {
  route(request: IncomingRequest): Promise<Response>;
  authenticate(token: string): Promise<User>;
  rateLimit(clientId: string): boolean;
  circuitBreak(serviceId: string): boolean;
}

class Gateway implements APIGateway {
  private routes: Map<string, ServiceEndpoint>;
  private circuitBreakers: Map<string, CircuitBreaker>;

  async route(request: IncomingRequest): Promise<Response> {
    const user = await this.authenticate(request.token);
    if (!this.rateLimit(user.clientId)) {
      throw new TooManyRequestsError();
    }

    const endpoint = this.routes.get(request.path);
    if (!endpoint) {
      throw new NotFoundError(request.path);
    }

    if (this.circuitBreak(endpoint.serviceId)) {
      return this.fallbackResponse(endpoint);
    }

    return endpoint.forward(request, user);
  }

  authenticate(token: string): Promise<User> {
    return this.authService.verify(token);
  }

  rateLimit(clientId: string): boolean {
    return this.rateLimiter.allow(clientId);
  }

  circuitBreak(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId);
    return breaker?.isOpen() ?? false;
  }

  private fallbackResponse(endpoint: ServiceEndpoint): Response {
    return {
      status: 503,
      body: { message: "Service temporarily unavailable" },
      headers: { "Retry-After": "30" }
    };
  }
}
\`\`\`

#### Service Mesh Architecture

A service mesh provides a **dedicated infrastructure layer** for handling service-to-service communication. Key components include:

| Component | Description | Example |
|-----------|-------------|---------|
| **Sidecar Proxy** | Intercepts all traffic | Envoy, Linkerd-proxy |
| **Control Plane** | Manages configuration | Istio, Linkerd |
| **Data Plane** | Handles actual traffic | Envoy proxies |
| **Certificate Authority** | Manages mTLS certs | SPIFFE/SPIRE |
| **Service Registry** | Tracks service instances | Consul, etcd |

#### Circuit Breaker Pattern

\`\`\`python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise CircuitOpenError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return False
        return (time.time() - self.last_failure_time) >= self.recovery_timeout
\`\`\`

### Inter-Service Communication

Communication between microservices falls into two categories:

#### Synchronous Communication

- **REST APIs** — Standard HTTP/JSON communication
- **gRPC** — High-performance binary protocol
- **GraphQL** — Flexible query language

#### Asynchronous Communication

- **Message Queues** — RabbitMQ, SQS, Redis Streams
- **Event Streaming** — Apache Kafka, AWS Kinesis
- **Pub/Sub** — Google Pub/Sub, SNS

### Database Per Service

Each microservice should own its data:

\`\`\`sql
-- User Service Database
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Order Service Database (separate!)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- references user, but NOT a foreign key
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
\`\`\`

---

## Event-Driven Architecture

### Core Concepts

Event-driven architecture (EDA) is a pattern where the production, detection, consumption, and reaction to **events** drives the system's behavior.

#### Event Types

1. **Domain Events** — Something that happened in the domain (\`OrderPlaced\`, \`UserRegistered\`)
2. **Integration Events** — Cross-boundary notifications
3. **Change Data Capture Events** — Database change notifications
4. **Command Events** — Requests for action

### Event Sourcing

Instead of storing current state, we store a **sequence of events**:

\`\`\`typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
}

class OrderAggregate {
  private events: Event[] = [];
  private state: OrderState = { status: "draft", items: [], total: 0 };

  apply(event: Event): void {
    this.events.push(event);

    switch (event.type) {
      case "OrderCreated":
        this.state = {
          ...this.state,
          status: "created",
          customerId: event.payload.customerId as string,
        };
        break;

      case "ItemAdded":
        const item = event.payload.item as OrderItem;
        this.state = {
          ...this.state,
          items: [...this.state.items, item],
          total: this.state.total + item.price * item.quantity,
        };
        break;

      case "OrderConfirmed":
        this.state = { ...this.state, status: "confirmed" };
        break;

      case "OrderShipped":
        this.state = {
          ...this.state,
          status: "shipped",
          trackingNumber: event.payload.trackingNumber as string,
        };
        break;

      case "OrderDelivered":
        this.state = { ...this.state, status: "delivered" };
        break;

      case "OrderCancelled":
        this.state = {
          ...this.state,
          status: "cancelled",
          cancellationReason: event.payload.reason as string,
        };
        break;
    }
  }

  getState(): OrderState {
    return { ...this.state };
  }

  getEvents(): Event[] {
    return [...this.events];
  }
}
\`\`\`

### CQRS (Command Query Responsibility Segregation)

CQRS separates **read** and **write** operations:

\`\`\`typescript
// Command side - handles writes
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = generateId();
    const event: Event = {
      id: generateId(),
      type: "OrderCreated",
      aggregateId: orderId,
      timestamp: new Date(),
      version: 1,
      payload: {
        customerId: command.customerId,
        items: command.items,
      },
    };

    await this.eventStore.append(orderId, event);
    await this.eventBus.publish(event);
    return orderId;
  }
}

// Query side - handles reads
class OrderQueryHandler {
  constructor(private readDb: ReadDatabase) {}

  async getOrder(orderId: string): Promise<OrderView> {
    return this.readDb.findById("orders_view", orderId);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderView[]> {
    return this.readDb.findMany("orders_view", {
      customerId,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.readDb.aggregate("orders_view", {
      totalOrders: { $count: {} },
      totalRevenue: { $sum: "$total" },
      averageOrderValue: { $avg: "$total" },
    });
  }
}
\`\`\`

### Message Broker Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Streams |
|---------|-------|----------|-----|---------------|
| **Throughput** | Very High | High | High | High |
| **Latency** | Low | Very Low | Medium | Very Low |
| **Ordering** | Per Partition | Per Queue | FIFO Queues | Per Stream |
| **Replay** | Yes | No | No | Yes |
| **Persistence** | Disk | Memory/Disk | Managed | Memory/Disk |
| **Scaling** | Partitions | Queues | Automatic | Sharding |
| **Dead Letters** | Manual | Built-in | Built-in | Manual |
| **Protocol** | Binary | AMQP | HTTP/SQS | RESP |

---

## Data Patterns

### Repository Pattern

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements Repository<User> {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter) {
      Object.entries(filter).forEach(([key, value], index) => {
        conditions.push(\`\${key} = $\${index + 1}\`);
        values.push(value);
      });
    }

    const whereClause = conditions.length
      ? \`WHERE \${conditions.join(" AND ")}\`
      : "";

    const result = await this.pool.query(
      \`SELECT * FROM users \${whereClause} ORDER BY created_at DESC\`,
      values
    );
    return result.rows;
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const result = await this.pool.query(
      \`INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *\`,
      [entity.email, entity.name, entity.passwordHash]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value], index) => {
      setClauses.push(\`\${key} = $\${index + 1}\`);
      values.push(value);
    });

    values.push(id);
    const result = await this.pool.query(
      \`UPDATE users SET \${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $\${values.length}
       RETURNING *\`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}
\`\`\`

### Caching Strategies

#### Cache-Aside (Lazy Loading)

\`\`\`typescript
class CacheAsideService<T> {
  constructor(
    private cache: RedisClient,
    private repository: Repository<T>,
    private ttl: number = 3600
  ) {}

  async get(id: string): Promise<T | null> {
    // 1. Check cache
    const cached = await this.cache.get(\`entity:\${id}\`);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 2. Cache miss — load from DB
    const entity = await this.repository.findById(id);
    if (entity) {
      await this.cache.setex(
        \`entity:\${id}\`,
        this.ttl,
        JSON.stringify(entity)
      );
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(\`entity:\${id}\`);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.repository.update(id, data);
    await this.cache.setex(
      \`entity:\${id}\`,
      this.ttl,
      JSON.stringify(updated)
    );
    return updated;
  }
}
\`\`\`

#### Write-Through Cache

\`\`\`go
type WriteThroughCache struct {
    cache      *redis.Client
    db         *sql.DB
    ttl        time.Duration
}

func (c *WriteThroughCache) Set(ctx context.Context, key string, value interface{}) error {
    // Write to DB first
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal: %w", err)
    }

    _, err = c.db.ExecContext(ctx,
        "INSERT INTO cache_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        key, data,
    )
    if err != nil {
        return fmt.Errorf("db write: %w", err)
    }

    // Then write to cache
    return c.cache.Set(ctx, key, data, c.ttl).Err()
}

func (c *WriteThroughCache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.cache.Get(ctx, key).Bytes()
    if err == redis.Nil {
        // Cache miss - load from DB
        row := c.db.QueryRowContext(ctx,
            "SELECT value FROM cache_store WHERE key = $1", key,
        )
        if err := row.Scan(&data); err != nil {
            return fmt.Errorf("db read: %w", err)
        }
        // Repopulate cache
        c.cache.Set(ctx, key, data, c.ttl)
    } else if err != nil {
        return fmt.Errorf("cache read: %w", err)
    }

    return json.Unmarshal(data, dest)
}
\`\`\`

### Data Migration Strategies

When evolving schemas in production:

- [ ] **Blue-Green Migrations** — Run both old and new schemas simultaneously
- [ ] **Expand-Contract Pattern** — Add new columns, migrate data, remove old columns
- [x] **Feature Flags** — Toggle new data paths with flags
- [x] **Shadow Writes** — Write to both old and new schemas
- [ ] **Backward-Compatible Changes** — Only additive schema changes

---

## Infrastructure

### Container Orchestration with Kubernetes

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v2.3.1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: api-gateway
        image: registry.example.com/api-gateway:v2.3.1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
\`\`\`

### Infrastructure as Code with Terraform

\`\`\`hcl
# Main infrastructure module
module "vpc" {
  source  = "./modules/vpc"

  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
\`\`\`

---

## Security

### Authentication & Authorization

#### JWT Token Flow

\`\`\`typescript
import { SignJWT, jwtVerify } from "jose";

class AuthService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(accessKey: string, refreshKey: string) {
    this.accessSecret = new TextEncoder().encode(accessKey);
    this.refreshSecret = new TextEncoder().encode(refreshKey);
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setIssuer("auth-service")
      .setAudience("api")
      .sign(this.accessSecret);

    const refreshToken = await new SignJWT({
      sub: user.id,
      tokenType: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .setIssuer("auth-service")
      .sign(this.refreshSecret);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, {
      issuer: "auth-service",
      audience: "api",
    });
    return payload;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload } = await jwtVerify(refreshToken, this.refreshSecret, {
      issuer: "auth-service",
    });

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) throw new UnauthorizedError("User not found");

    return this.generateTokenPair(user);
  }
}
\`\`\`

#### Role-Based Access Control (RBAC)

\`\`\`typescript
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "orders" | "products" | "reports";

interface RBACPolicy {
  role: string;
  permissions: Map<Resource, Permission[]>;
}

const policies: RBACPolicy[] = [
  {
    role: "viewer",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read"]],
      ["products", ["read"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "editor",
    permissions: new Map([
      ["users", ["read"]],
      ["orders", ["read", "write"]],
      ["products", ["read", "write"]],
      ["reports", ["read"]],
    ]),
  },
  {
    role: "admin",
    permissions: new Map([
      ["users", ["read", "write", "delete", "admin"]],
      ["orders", ["read", "write", "delete", "admin"]],
      ["products", ["read", "write", "delete", "admin"]],
      ["reports", ["read", "write", "delete", "admin"]],
    ]),
  },
];

function authorize(
  userRoles: string[],
  resource: Resource,
  permission: Permission
): boolean {
  return userRoles.some((role) => {
    const policy = policies.find((p) => p.role === role);
    if (!policy) return false;
    const perms = policy.permissions.get(resource);
    return perms?.includes(permission) ?? false;
  });
}
\`\`\`

### Security Best Practices Checklist

- [x] Input validation at all boundaries
- [x] Parameterized queries (no string concatenation)
- [x] HTTPS everywhere (TLS 1.3)
- [x] Rate limiting on all endpoints
- [x] CORS configuration
- [ ] Content Security Policy headers
- [ ] Subresource Integrity (SRI)
- [x] Secrets management (Vault, AWS Secrets Manager)
- [x] Dependency vulnerability scanning
- [ ] Penetration testing schedule

---

## Performance

### Performance Optimization Techniques

#### Database Query Optimization

\`\`\`sql
-- Before: N+1 query problem
-- This fetches each order's items separately (BAD!)
SELECT * FROM orders WHERE user_id = '123';
-- Then for EACH order: SELECT * FROM order_items WHERE order_id = ?;

-- After: Single query with JOIN
SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
ORDER BY o.created_at DESC, oi.id;

-- Optimize with proper indexing
CREATE INDEX CONCURRENTLY idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_order_items_order_id
    ON order_items(order_id)
    INCLUDE (product_id, product_name, quantity, unit_price);

-- Use EXPLAIN ANALYZE to verify
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, COUNT(oi.id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '123'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.status;
\`\`\`

#### Connection Pooling

\`\`\`typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool size tuning
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
  metrics.increment("db.pool.errors");
});

pool.on("connect", () => {
  metrics.increment("db.pool.connections");
});

pool.on("remove", () => {
  metrics.decrement("db.pool.connections");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
\`\`\`

### Load Testing Results

| Scenario | RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate |
|----------|-----|----------|----------|----------|------------|
| **Read (cached)** | 50,000 | 2 | 8 | 15 | 0.001% |
| **Read (DB)** | 10,000 | 12 | 45 | 120 | 0.01% |
| **Write (simple)** | 5,000 | 25 | 80 | 200 | 0.05% |
| **Write (complex)** | 2,000 | 50 | 150 | 400 | 0.1% |
| **Search** | 3,000 | 35 | 100 | 250 | 0.02% |
| **Aggregation** | 500 | 200 | 500 | 1,200 | 0.1% |
| **File Upload** | 100 | 500 | 2,000 | 5,000 | 0.5% |
| **Batch Process** | 50 | 1,000 | 3,000 | 8,000 | 0.2% |

---

## Testing Strategies

### Testing Pyramid

\`\`\`
         /\\
        /  \\
       / E2E \\
      /________\\
     /          \\
    / Integration \\
   /______________\\
  /                \\
 /    Unit Tests    \\
/____________________\\
\`\`\`

### Unit Testing Example

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: MockRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    orderService = new OrderService(mockRepository, mockEventBus);
  });

  describe("createOrder", () => {
    it("should create an order with valid items", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: 2, price: 29.99 },
        { productId: "p2", name: "Gadget", quantity: 1, price: 49.99 },
      ];

      mockRepository.create.mockResolvedValue({
        id: "order-1",
        items,
        total: 109.97,
        status: "pending",
      });

      const order = await orderService.createOrder("customer-1", items);

      expect(order.total).toBe(109.97);
      expect(order.status).toBe("pending");
      expect(mockRepository.create).toHaveBeenCalledOnce();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "OrderCreated",
          payload: expect.objectContaining({
            orderId: "order-1",
          }),
        })
      );
    });

    it("should reject orders with no items", async () => {
      await expect(
        orderService.createOrder("customer-1", [])
      ).rejects.toThrow("Order must contain at least one item");
    });

    it("should reject items with negative quantities", async () => {
      const items = [
        { productId: "p1", name: "Widget", quantity: -1, price: 29.99 },
      ];

      await expect(
        orderService.createOrder("customer-1", items)
      ).rejects.toThrow("Item quantity must be positive");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockRepository.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      const result = await orderService.cancelOrder("order-1", "Changed mind");

      expect(result.status).toBe("cancelled");
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "OrderCancelled" })
      );
    });

    it("should not cancel a shipped order", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(
        orderService.cancelOrder("order-1", "Too late")
      ).rejects.toThrow("Cannot cancel order with status: shipped");
    });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("UserRepository Integration", () => {
  let container: StartedTestContainer;
  let pool: Pool;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({
        POSTGRES_DB: "test",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
      })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: "test",
      user: "test",
      password: "test",
    });

    // Run migrations
    await runMigrations(pool);

    repository = new PostgresUserRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("should create and retrieve a user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed_password",
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it("should update user fields", async () => {
    const user = await repository.create({
      email: "update@example.com",
      name: "Original Name",
      passwordHash: "hashed",
    });

    const updated = await repository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.email).toBe("update@example.com");
  });
});
\`\`\`

---

## Deployment Patterns

### Blue-Green Deployment

\`\`\`bash
#!/bin/bash
# Blue-Green deployment script

CURRENT_ENV=$(get_active_environment)
TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT_ENV -> Target: $TARGET_ENV"

# Deploy to target environment
deploy_to_environment "$TARGET_ENV" "$IMAGE_TAG"

# Run health checks
if ! health_check "$TARGET_ENV"; then
    echo "ERROR: Health check failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Run smoke tests
if ! smoke_test "$TARGET_ENV"; then
    echo "ERROR: Smoke tests failed on $TARGET_ENV"
    rollback "$TARGET_ENV"
    exit 1
fi

# Switch traffic
switch_traffic "$TARGET_ENV"

echo "Successfully deployed to $TARGET_ENV"
echo "Previous environment $CURRENT_ENV is now standby"
\`\`\`

### Canary Deployment

\`\`\`yaml
# Istio VirtualService for canary routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: canary
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api-service
  subsets:
  - name: stable
    labels:
      version: v2.3.0
  - name: canary
    labels:
      version: v2.4.0-rc1
\`\`\`

### Feature Flags

\`\`\`typescript
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRules: TargetRule[];
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  isEnabled(flagName: string, context: EvaluationContext): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check target rules first
    for (const rule of flag.targetRules) {
      if (this.matchesRule(rule, context)) {
        return rule.enabled;
      }
    }

    // Fall back to percentage rollout
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const hash = this.hashUserId(context.userId, flagName);
    return hash % 100 < flag.rolloutPercentage;
  }

  private matchesRule(rule: TargetRule, ctx: EvaluationContext): boolean {
    switch (rule.type) {
      case "user_id":
        return rule.values.includes(ctx.userId);
      case "email_domain":
        return rule.values.some((d) => ctx.email?.endsWith(d));
      case "country":
        return rule.values.includes(ctx.country);
      case "plan":
        return rule.values.includes(ctx.plan);
      default:
        return false;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
\`\`\`

---

## Observability

### The Three Pillars

#### 1. Logging

\`\`\`typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  redact: ["req.headers.authorization", "password", "token"],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Structured logging
logger.info(
  {
    orderId: "order-123",
    customerId: "cust-456",
    total: 99.99,
    itemCount: 3,
  },
  "Order created successfully"
);

logger.warn(
  {
    service: "payment",
    attempt: 3,
    latencyMs: 2500,
  },
  "Payment processing slow"
);

logger.error(
  {
    err: new Error("Connection refused"),
    host: "db-primary.internal",
    port: 5432,
  },
  "Database connection failed"
);
\`\`\`

#### 2. Metrics

\`\`\`typescript
import { Counter, Histogram, Gauge, Registry } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [registry],
});

// Usage in middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({
      method: req.method,
      path: req.route?.path || "unknown",
      status: res.statusCode,
    });
    httpDuration.observe(
      { method: req.method, path: req.route?.path || "unknown" },
      duration
    );
    activeConnections.dec();
  });

  next();
}
\`\`\`

#### 3. Distributed Tracing

\`\`\`typescript
import { trace, SpanStatusCode, context } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan("processOrder", {
    attributes: {
      "order.id": orderId,
    },
  });

  try {
    // Validate order
    await context.with(trace.setSpan(context.active(), span), async () => {
      const validateSpan = tracer.startSpan("validateOrder");
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await context.with(trace.setSpan(context.active(), span), async () => {
      const paymentSpan = tracer.startSpan("processPayment");
      paymentSpan.setAttribute("payment.method", "credit_card");
      await processPayment(orderId);
      paymentSpan.end();
    });

    // Send confirmation
    await context.with(trace.setSpan(context.active(), span), async () => {
      const notifySpan = tracer.startSpan("sendConfirmation");
      await sendConfirmation(orderId);
      notifySpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
\`\`\`

### Alerting Rules

\`\`\`yaml
# Prometheus alerting rules
groups:
- name: application
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High P95 latency"
      description: "P95 latency is {{ $value }}s"

  - alert: PodMemoryWarning
    expr: |
      container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod memory usage high"
      description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count / pg_settings_max_connections > 0.9
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
\`\`\`

---

## Mathematical Formulas

### Amdahl's Law for Parallel Computing

The theoretical speedup from parallelization is:

$$S(n) = \\frac{1}{(1 - p) + \\frac{p}{n}}$$

Where:
- $S(n)$ = speedup with $n$ processors
- $p$ = proportion of parallelizable code
- $n$ = number of processors

### Little's Law for Queue Theory

$$L = \\lambda \\cdot W$$

Where:
- $L$ = average number of items in the system
- $\\lambda$ = average arrival rate
- $W$ = average time an item spends in the system

### SLA/SLO Calculations

The number of allowed downtime minutes per month at various SLA levels:

| SLA Level | Monthly Uptime | Monthly Downtime |
|-----------|----------------|------------------|
| 99% | 43,171.2 min | 438.0 min (~7.3 hrs) |
| 99.9% | 43,556.9 min | 43.8 min |
| 99.95% | 43,578.8 min | 21.9 min |
| 99.99% | 43,595.4 min | 4.4 min |
| 99.999% | 43,599.6 min | 0.4 min (~26 sec) |

---

## Conclusion

Modern software architecture is an evolving discipline. The patterns and practices described in this guide represent the **current state of the art**, but technology continues to advance. Key takeaways:

1. **Start simple** — Don't over-architect from day one
2. **Evolve incrementally** — Adopt patterns as complexity demands them
3. **Measure everything** — You can't improve what you can't measure
4. **Automate relentlessly** — CI/CD, testing, monitoring, alerting
5. **Design for failure** — Assume everything will break
6. **Keep learning** — The landscape changes constantly

> *"Simplicity is the ultimate sophistication."*
> — Leonardo da Vinci

**Thank you for reading this comprehensive guide. Happy building!**

`;
