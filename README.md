# Chattt

A modern real-time chat application built with NestJS (GraphQL API) and Next.js (React frontend).

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd chattt
   ```

2. **Start the development environment:**
   ```bash
   make setup
   # or
   ./scripts/dev-setup.sh
   ```

3. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **API:** http://localhost:4000
   - **Email UI:** http://localhost:8025 (Mailhog)
   - **Database:** postgres://postgres:postgres@localhost:5432/chattt

## 🏗️ Architecture

- **API** (NestJS): GraphQL API with WebSocket support for real-time chat
- **Frontend** (Next.js): React-based UI with real-time updates
- **Database** (PostgreSQL): Primary data storage
- **Redis**: Caching and session management
- **Mailhog**: Local email testing (development only)

## 🛠️ Development

### Available Commands

```bash
# Development
make dev              # Start development environment
make dev-logs         # View development logs
make dev-down         # Stop development environment

# Database
make migrate          # Run database migrations
make db-reset         # Reset database
make db-seed          # Seed database with test data
make db-shell         # Access database shell

# Testing
make test-api         # Run API tests
make test-frontend    # Run frontend tests

# Utilities
make health           # Check service health
make clean            # Clean up Docker resources
```

### Manual Development Setup

If you prefer running services individually:

#### API (NestJS)
```bash
cd api
npm install
npm run start:dev
```

#### Frontend (Next.js)
```bash
cd front
npm install
npm run dev
```

## 🏭 Production

### Docker Production Deployment

```bash
# Update .env with production values
make prod
# or
./scripts/prod-deploy.sh
```

### Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
# Core settings
NODE_ENV=production
DB_PASSWORD=secure-production-password
JWT_SECRET=very-secure-jwt-secret

# External services
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
```

## 📝 Documentation

- **[Docker Setup Guide](DOCKER.md)** - Comprehensive Docker setup and usage
- **[API Documentation](api/README.md)** - NestJS API details
- **GraphQL Playground:** http://localhost:4000/graphql (when running)

## 🔧 Technology Stack

### Backend
- **NestJS** - Node.js framework
- **GraphQL** - API query language
- **TypeORM** - Database ORM
- **PostgreSQL** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Nodemailer** - Email service

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **HeroUI** - UI components
- **Socket.io Client** - Real-time updates

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Redis** - Caching
- **Mailhog** - Email testing

## 🌟 Features

- Real-time chat messaging
- User authentication (registration, login, email verification)
- Password reset functionality
- GraphQL API with subscriptions
- Responsive UI design
- Email notifications
- Docker development environment
- Production-ready setup

## 🧪 Testing

```bash
# Run all tests
make test-api
make test-frontend

# Run specific test suites
docker compose exec api npm run test:e2e
docker compose exec frontend npm run test
```

## 🔍 Monitoring and Debugging

### View Logs
```bash
# All services
make dev-logs

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f database
```

### Health Checks
```bash
# Check all services
make health

# Individual health checks
curl http://localhost:4000/health
curl http://localhost:3000
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts:** Update ports in `.env` file
2. **Database connection issues:** Check database logs and environment variables
3. **Build failures:** Clear Docker cache with `make clean`

### Reset Everything
```bash
# Complete reset (removes all data)
make dev-clean
make setup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `make test-api` and `make test-frontend`
5. Submit a pull request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.