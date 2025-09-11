import { KnowledgeGraph } from '@/types/knowledge';

export const mockGraph: KnowledgeGraph = {
  nodes: [
    // UI Pages
    {
      id: 'ui-dashboard',
      name: 'Dashboard',
      type: 'ui',
      service: 'Frontend',
      description: `# Dashboard Page

The main dashboard provides an overview of system metrics and status.

## Features
- Real-time metrics visualization
- System health monitoring
- Quick access to key actions
- Responsive grid layout

## Technical Details
Built with React and TypeScript, using Chart.js for data visualization.`,
      sourceFiles: ['/src/pages/Dashboard.tsx', '/src/components/MetricsCard.tsx']
    },
    {
      id: 'ui-users',
      name: 'Users Management',
      type: 'ui',
      service: 'Frontend',
      description: `# Users Management Interface

Comprehensive user management interface for administrators.

## Capabilities
- User CRUD operations
- Role assignment
- Permission management
- Bulk operations

## Components
- UserTable
- UserForm
- RoleSelector`,
      sourceFiles: ['/src/pages/Users.tsx', '/src/components/UserTable.tsx']
    },
    {
      id: 'ui-settings',
      name: 'Settings',
      type: 'ui',
      service: 'Frontend',
      description: `# Settings Page

Application configuration and preferences management.`,
      sourceFiles: ['/src/pages/Settings.tsx']
    },
    
    // API Endpoints
    {
      id: 'api-users',
      name: '/api/users',
      type: 'api',
      service: 'User Service',
      description: `# Users API Endpoint

RESTful API for user management operations.

## Endpoints
- \`GET /api/users\` - List all users
- \`POST /api/users\` - Create new user
- \`PUT /api/users/:id\` - Update user
- \`DELETE /api/users/:id\` - Delete user

## Authentication
Requires Bearer token with admin privileges.`,
      sourceFiles: ['/api/routes/users.js', '/api/middleware/auth.js']
    },
    {
      id: 'api-metrics',
      name: '/api/metrics',
      type: 'api',
      service: 'Analytics Service',
      description: `# Metrics API

Provides system metrics and analytics data.

## Response Format
\`\`\`json
{
  "cpu": 45.2,
  "memory": 78.5,
  "requests": 1542
}
\`\`\``,
      sourceFiles: ['/api/routes/metrics.js']
    },
    {
      id: 'api-auth',
      name: '/api/auth',
      type: 'api',
      service: 'Auth Service',
      description: `# Authentication API

Handles user authentication and authorization.

## Endpoints
- \`POST /api/auth/login\`
- \`POST /api/auth/logout\`
- \`POST /api/auth/refresh\``,
      sourceFiles: ['/api/routes/auth.js', '/api/utils/jwt.js']
    },
    {
      id: 'api-settings',
      name: '/api/settings',
      type: 'api',
      service: 'Config Service',
      description: `# Settings API

Manages application configuration.`,
      sourceFiles: ['/api/routes/settings.js']
    },
    
    // Database Tables
    {
      id: 'db-users',
      name: 'users',
      type: 'database',
      service: 'PostgreSQL',
      description: `# Users Table

Primary user data storage.

## Schema
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  role_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
\`\`\`

## Indexes
- \`idx_users_email\` on email
- \`idx_users_role\` on role_id`,
      sourceFiles: ['/db/migrations/001_users.sql']
    },
    {
      id: 'db-sessions',
      name: 'sessions',
      type: 'database',
      service: 'PostgreSQL',
      description: `# Sessions Table

Stores active user sessions.

## Schema
\`\`\`sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT,
  expires_at TIMESTAMP
);
\`\`\``,
      sourceFiles: ['/db/migrations/002_sessions.sql']
    },
    {
      id: 'db-metrics',
      name: 'metrics',
      type: 'database',
      service: 'TimescaleDB',
      description: `# Metrics Table

Time-series data for system metrics.

## Hypertable Configuration
Partitioned by time with 7-day chunks.`,
      sourceFiles: ['/db/migrations/003_metrics.sql']
    },
    {
      id: 'db-settings',
      name: 'app_settings',
      type: 'database',
      service: 'PostgreSQL',
      description: `# Application Settings Table

Key-value store for application configuration.`,
      sourceFiles: ['/db/migrations/004_settings.sql']
    }
  ],
  links: [
    // UI to API connections
    { source: 'ui-dashboard', target: 'api-metrics', relationshipType: 'fetches' },
    { source: 'ui-dashboard', target: 'api-users', relationshipType: 'queries' },
    { source: 'ui-users', target: 'api-users', relationshipType: 'manages' },
    { source: 'ui-users', target: 'api-auth', relationshipType: 'authenticates' },
    { source: 'ui-settings', target: 'api-settings', relationshipType: 'configures' },
    
    // API to Database connections
    { source: 'api-users', target: 'db-users', relationshipType: 'reads/writes' },
    { source: 'api-auth', target: 'db-users', relationshipType: 'validates' },
    { source: 'api-auth', target: 'db-sessions', relationshipType: 'creates' },
    { source: 'api-metrics', target: 'db-metrics', relationshipType: 'stores' },
    { source: 'api-settings', target: 'db-settings', relationshipType: 'persists' }
  ]
};