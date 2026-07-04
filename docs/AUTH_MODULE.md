# SpeedaPay Authentication & Identity Module

## Overview

The Authentication & Identity module is the foundation of the SpeedaPay ecosystem. It provides secure user authentication, session management, and identity verification.

## Features

### Authentication Methods
- **OTP (One-Time Password)**: SMS-based OTP for registration and login
- **Username/Password**: Optional secondary authentication method
- **PIN**: 4-digit PIN for transaction authorization
- **Biometric**: Fingerprint and Face ID support (placeholder)
- **Trusted Devices**: Skip secondary auth on known devices

### Security
- Multi-factor authentication support
- JWT-based session tokens
- Bcrypt password hashing
- Rate limiting on login attempts
- Comprehensive audit logging
- Fraud detection and suspicious activity tracking

## Architecture

### Database Schema

#### Users Table
Core user information with security status.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  username VARCHAR(50) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  pin_hash VARCHAR(255),
  role VARCHAR(20),
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### OTP Verifications Table
Temporary OTP records for authentication.

```sql
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  phone_number VARCHAR(20),
  otp_hash VARCHAR(255),
  purpose VARCHAR(20),
  is_verified BOOLEAN,
  attempts INT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

#### Sessions Table
Active user sessions with device tracking.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  device_os VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  access_token_hash VARCHAR(255),
  refresh_token_hash VARCHAR(255),
  is_trusted BOOLEAN,
  is_active BOOLEAN,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

#### Audit Logs Table
Complete audit trail of all authentication events.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  device_id VARCHAR(255),
  status VARCHAR(20),
  created_at TIMESTAMP
);
```

## API Reference

### Public Endpoints

#### 1. Request OTP
```
POST /api/v1/auth/request-otp
```

**Request:**
```json
{
  "phone_number": "+231775555555",
  "purpose": "registration" // or "login"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otp_id": "uuid",
    "expires_in": 600
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid phone number format",
  "code": "VALIDATION_ERROR"
}
```

#### 2. Register User
```
POST /api/v1/auth/register
```

**Request:**
```json
{
  "phone_number": "+231775555555",
  "otp_code": "123456",
  "first_name": "John",
  "last_name": "Doe",
  "device_id": "device-uuid",
  "device_name": "iPhone 13",
  "device_os": "iOS"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered and logged in successfully",
  "data": {
    "session_id": "uuid",
    "access_token": "jwt_token",
    "refresh_token": "jwt_token",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "phone_number": "+231775555555",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer"
    }
  }
}
```

#### 3. Login User
```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "phone_number": "+231775555555",
  "otp_code": "123456",
  "device_id": "device-uuid",
  "device_name": "iPhone 13",
  "device_os": "iOS"
}
```

**Response:** Same as Register endpoint

### Protected Endpoints

#### 1. Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone_number": "+231775555555",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "customer",
    "status": "active"
  }
}
```

#### 2. Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### 3. Update Profile
```
PATCH /api/v1/users/profile
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ...user_data }
}
```

#### 4. Set PIN
```
POST /api/v1/users/set-pin
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "pin": "1234",
  "confirm_pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

#### 5. Get Audit Logs
```
GET /api/v1/users/audit-logs?limit=50
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "user_login",
      "ip_address": "192.168.1.1",
      "device_id": "device-uuid",
      "created_at": "2026-07-04T12:00:00Z"
    }
  ]
}
```

## Security Implementation

### OTP Security
- OTPs expire after 10 minutes
- Maximum 3 verification attempts per OTP
- Failed attempts logged for fraud detection
- Rate limiting: 3 requests per minute per phone number

### Password Security
- Minimum 8 characters
- Must include uppercase, lowercase, and numbers
- Hashed with bcrypt (12 rounds)
- Never stored in plain text

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Tokens signed with RS256 encryption
- Token rotation supported

### Session Security
- Sessions tracked by device ID
- IP address logging
- Device fingerprinting
- Automatic logout on suspicious activity
- Session timeout after 30 minutes of inactivity

### Login Protection
- Rate limiting: 5 attempts per 15 minutes
- Account lockout after 5 failed attempts
- Suspicious login detection
- Failed login attempt logging
- IP-based anomaly detection

## Setup & Installation

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis (optional, for caching)

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create `.env` file:

```
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=speedapay_dev
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=2592000

# OTP
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Encryption
ENCRYPTION_KEY=your_encryption_key_min_32_chars

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Database Setup

```bash
# Run migrations
npm run migrate
```

### Start Development Server

```bash
npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_CREDENTIALS | 401 | Invalid phone number or password |
| USER_NOT_FOUND | 404 | User does not exist |
| USER_ALREADY_EXISTS | 409 | User already registered |
| INVALID_OTP | 401 | OTP code is incorrect |
| OTP_EXPIRED | 401 | OTP has expired |
| OTP_ATTEMPTS_EXCEEDED | 429 | Too many OTP attempts |
| INVALID_TOKEN | 401 | Invalid or malformed token |
| TOKEN_EXPIRED | 401 | Token has expired |
| ACCOUNT_SUSPENDED | 403 | User account is suspended |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| VALIDATION_ERROR | 422 | Invalid input data |
| INTERNAL_ERROR | 500 | Server error |

## Testing

### Unit Tests
Tests for individual functions and services.

### Integration Tests
Tests for complete workflows (registration, login, etc.).

### Security Tests
- Rate limiting verification
- OTP expiry validation
- Token expiry validation
- Password hashing verification
- SQL injection prevention
- XSS prevention

## Next Module

After authentication is complete and approved, the next module will be:
**Module 2: Wallet Management**

Dependencies:
- Module 1: Authentication & Identity (Current)

## Support

For issues or questions, please contact the SpeedaPay development team.
