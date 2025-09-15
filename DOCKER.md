# Docker Compose Setup for Chattt

This repository includes a comprehensive Docker Compose setup to run the entire Chattt application stack locally for development and production.

## 🏗️ Architecture

The Docker Compose setup includes the following services:

- **API** (NestJS): Backend GraphQL API server
- **Frontend** (Next.js): React-based frontend application  
- **Database** (PostgreSQL): Primary data storage
- **Redis**: Caching and session storage
- **Mailhog**: Local email testing (development only)
- **Migrations**: One-shot service for database setup

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### Development Environment

1. Clone the repository and navigate to the root directory
2. Run the development setup script:
   ```bash
   ./scripts/dev-setup.sh
   ```

This will:
- Create a `.env` file from the example
- Build all Docker images
- Start all services
- Run database migrations and seeds

### Manual Setup

If you prefer manual setup:

1. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

2. **Start the development environment:**
   ```bash
   docker-compose up -d --build
   ```

3. **Run database setup:**
   ```bash
   docker-compose run --rm migrations
   ```

## 🔧 Available Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| API | http://localhost:4000 | NestJS GraphQL API |
| Mailhog UI | http://localhost:8025 | Email testing interface |
| Database | localhost:5432 | PostgreSQL database |
| Redis | localhost:6379 | Redis cache |

## 📝 Environment Configuration

The `.env` file contains all configuration options. Key variables:

```bash
# Environment
NODE_ENV=development
BUILD_TARGET=dev

# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=chattt

# API
API_PORT=4000
JWT_SECRET=your-secure-secret

# Frontend
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🏭 Production Deployment

For production deployment:

1. **Update environment variables:**
   ```bash
   # Set production values in .env
   NODE_ENV=production
   BUILD_TARGET=production
   JWT_SECRET=very-secure-production-secret
   DB_PASSWORD=secure-database-password
   ```

2. **Deploy:**
   ```bash
   ./scripts/prod-deploy.sh
   ```

Or manually:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 🛠️ Common Commands

### Service Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Rebuild and restart
docker-compose up -d --build
```

### Database Operations
```bash
# Run migrations
docker-compose run --rm migrations

# Reset and seed database
docker-compose exec api npm run db:reset
docker-compose exec api npm run db:seed

# Access database directly
docker-compose exec database psql -U postgres -d chattt
```

### Development Workflow
```bash
# Install new dependencies (API)
docker-compose exec api npm install package-name
docker-compose restart api

# Install new dependencies (Frontend)
docker-compose exec frontend npm install package-name
docker-compose restart frontend

# Run tests
docker-compose exec api npm test
docker-compose exec frontend npm test
```

## 🔍 Debugging

### View Container Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f database
```

### Access Container Shell
```bash
# API container
docker-compose exec api sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec database psql -U postgres -d chattt
```

### Check Service Health
```bash
# Check running containers
docker-compose ps

# Check service health
docker-compose exec api curl -f http://localhost:4000/health
docker-compose exec frontend curl -f http://localhost:3000/api/health
```

## 📂 Volume Management

The setup uses Docker volumes for persistent data:

- `postgres_data`: Database files
- `redis_data`: Redis persistence files

To reset all data:
```bash
docker-compose down -v
```

## 🔒 Security Considerations

### Development
- Default passwords are used for convenience
- Mailhog is included for email testing
- Hot reload is enabled

### Production
- Change all default passwords
- Use secure JWT secrets
- Remove development tools
- Configure proper email SMTP
- Consider using external managed databases

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Change ports in `.env` if they're already in use
   - Default ports: 3000 (frontend), 4000 (api), 5432 (database), 6379 (redis), 8025 (mailhog)

2. **Database connection issues:**
   - Ensure database service is healthy: `docker-compose ps`
   - Check database logs: `docker-compose logs database`
   - Verify environment variables in `.env`

3. **Build failures:**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild images: `docker-compose build --no-cache`

4. **Permission issues:**
   - Make sure scripts are executable: `chmod +x scripts/*.sh`
   - Check file ownership in volumes

### Getting Help

1. Check service logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Docker has sufficient resources allocated
4. Try rebuilding images with `--no-cache` flag

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Update API dependencies
docker-compose exec api npm update
docker-compose restart api

# Update Frontend dependencies  
docker-compose exec frontend npm update
docker-compose restart frontend
```

### Backup and Restore
```bash
# Backup database
docker-compose exec database pg_dump -U postgres chattt > backup.sql

# Restore database
docker-compose exec -T database psql -U postgres chattt < backup.sql
```