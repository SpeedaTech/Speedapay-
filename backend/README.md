# SpeedaPay Backend - README

## Project Overview

SpeedaPay Backend is the core API server for the SpeedaPay financial ecosystem. It handles all business logic, database operations, and integrations.

## Current Status

**Module 1: Authentication & Identity** - In Development

## Technology Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js 4.18+
- **Database:** PostgreSQL 12+
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs, helmet, express-rate-limit
- **Testing:** Jest, Supertest
- **Logging:** Winston

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database connection pool
│   │   ├── constants.js  # Application constants
│   │   └── env.js        # Environment variables
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # JWT authentication
│   │   ├── errorHandler.js
│   │   └── rateLimit.js
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   └── userController.js
│   ├── services/         # Business logic
│   │   └── authService.js
│   ├── models/           # Database models
│   │   ├── User.js
│   │   ├── OTPVerification.js
│   │   ├── Session.js
│   │   ├── AuditLog.js
│   │   ├── LoginAttempt.js
│   │   └── TrustedDevice.js
│   ├── routes/           # API routes
│   │   ├── authRoutes.js
│   │   └── userRoutes.js
│   ├── utils/            # Utility functions
│   │   ├── jwt.js
│   │   ├── encryption.js
│   │   ├── validation.js
│   │   └── logger.js
│   ├── db/               # Database migrations
│   │   ├── 001_init_auth_schema.sql
│   │   └── migrate.js
│   └── app.js            # Express app setup
├── tests/                # Test files
│   ├── auth.test.js
│   └── health.test.js
├── .env.example          # Environment template
├── package.json
├── server.js             # Entry point
└── README.md
```

## Getting Started

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**
   ```bash
   npm run migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user

### User Management
- `PATCH /api/v1/users/profile` - Update profile
- `POST /api/v1/users/set-pin` - Set transaction PIN
- `GET /api/v1/users/audit-logs` - Get audit logs

### Health Check
- `GET /health` - API health status

## Development

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Migrations
```bash
# Run migrations
npm run migrate
```

## Environment Variables

See `.env.example` for all available configuration options.

**Critical variables:**
- `JWT_SECRET` - Must be at least 32 characters
- `ENCRYPTION_KEY` - Must be at least 32 characters
- `DB_*` - Database connection details

## Security Considerations

✅ All passwords and PINs are hashed with bcrypt  
✅ JWT tokens expire after 1 hour  
✅ Rate limiting on login attempts (5/15min)  
✅ OTP expires after 10 minutes  
✅ All sensitive data is encrypted  
✅ Comprehensive audit logging  
✅ SQL injection prevention via parameterized queries  
⚠️ XSS protection via helmet middleware  

## Performance

- Connection pooling for database
- Request logging and monitoring
- Error handling and recovery
- Support for millions of users

## Deployment

See `docs/DEPLOYMENT.md` for production deployment guidelines.

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit pull request

## Support

For issues or questions, contact the SpeedaPay team.

## License

Proprietary - SpeedaTech
