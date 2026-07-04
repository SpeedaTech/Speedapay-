# Module 2: Wallet Management System

**Status:** Design Phase  
**Branch:** `module/wallet-management`  
**Dependencies:** Module 1 (Authentication & Identity) ✅ Complete  
**Estimated Duration:** 2-3 weeks  

---

## 🎯 MODULE OVERVIEW

**Purpose:** Create a secure, multi-currency wallet system that manages user balances, tracks transactions, and enforces financial limits.

**Core Concept:** Every user has wallets (USD and LRD). Balances are calculated from the immutable transaction ledger, never stored directly.

---

## 🏗️ ARCHITECTURE DESIGN

### Wallet Hierarchy
```
User (from Module 1)
├── USD Wallet
│   ├── Available Balance
│   ├── Pending Balance
│   ├── Frozen Balance (for holds)
│   └── Transaction History
└── LRD Wallet
    ├── Available Balance
    ├── Pending Balance
    ├── Frozen Balance
    └── Transaction History
```

### Balance Calculation (CRITICAL)
```
Available Balance = SUM(all completed transactions)
Pending Balance = SUM(all pending transactions)
Frozen Balance = SUM(all held amounts)
Total Balance = Available + Pending + Frozen

NOTE: Balances are NEVER stored directly.
They are calculated from transaction ledger.
```

### Wallet States
```
ACTIVE → User can send and receive
FROZEN → User cannot send (admin action, fraud investigation)
SUSPENDED → Temporarily inactive (limits exceeded)
CLOSED → Permanently inactive
```

### Transaction Types (for future use)
- Transfer (P2P)
- Merchant Payment
- Agent Cash-in/Cash-out
- Refund
- Reversal
- Fee Deduction
- Bonus/Reward

---

## 🗄️ DATABASE SCHEMA

### Wallets Table
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  currency VARCHAR(3) NOT NULL, -- 'USD', 'LRD'
  
  -- Balance tracking (calculated from ledger)
  available_balance DECIMAL(15,2) DEFAULT 0,
  pending_balance DECIMAL(15,2) DEFAULT 0,
  frozen_balance DECIMAL(15,2) DEFAULT 0,
  total_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Last balance update timestamp
  balance_updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Wallet status
  status VARCHAR(20) DEFAULT 'active', -- active, frozen, suspended, closed
  
  -- Wallet configuration
  daily_send_limit DECIMAL(15,2),
  monthly_send_limit DECIMAL(15,2),
  daily_receive_limit DECIMAL(15,2),
  monthly_receive_limit DECIMAL(15,2),
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint: one wallet per user per currency
  UNIQUE(user_id, currency)
);
```

### Wallet Limits Table
```sql
CREATE TABLE wallet_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  
  -- Daily tracking
  daily_sent_amount DECIMAL(15,2) DEFAULT 0,
  daily_sent_count INT DEFAULT 0,
  daily_received_amount DECIMAL(15,2) DEFAULT 0,
  daily_received_count INT DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
  
  -- Monthly tracking
  monthly_sent_amount DECIMAL(15,2) DEFAULT 0,
  monthly_sent_count INT DEFAULT 0,
  monthly_received_amount DECIMAL(15,2) DEFAULT 0,
  monthly_received_count INT DEFAULT 0,
  monthly_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 month',
  
  -- Last update
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Wallet Transactions Table (Ledger)
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL, -- transfer, payment, cash_in, cash_out, refund, etc.
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  
  -- Transaction parties
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled, reversed
  
  -- Reference
  reference_id VARCHAR(255) UNIQUE, -- Idempotency key
  description TEXT,
  metadata JSONB,
  
  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP
);
```

### Wallet Holds Table (For transactions in progress)
```sql
CREATE TABLE wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Hold details
  transaction_id UUID REFERENCES wallet_transactions(id),
  amount DECIMAL(15,2) NOT NULL,
  reason VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, released, expired
  
  -- Expiration
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  released_at TIMESTAMP
);
```

### Exchange Rates Table
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  source VARCHAR(50), -- 'market', 'fixed', 'admin'
  active BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMP DEFAULT NOW(),
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Wallet Activity Log
```sql
CREATE TABLE wallet_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Activity details
  activity_type VARCHAR(50), -- balance_update, status_change, limit_change, etc.
  old_value JSONB,
  new_value JSONB,
  reason VARCHAR(255),
  performed_by UUID REFERENCES users(id), -- NULL if system
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Create Indexes
```sql
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallet_txn_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_txn_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_txn_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_txn_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_txn_ref_id ON wallet_transactions(reference_id);
CREATE INDEX idx_wallet_holds_wallet_id ON wallet_holds(wallet_id);
CREATE INDEX idx_wallet_holds_expires ON wallet_holds(expires_at);
CREATE INDEX idx_exchange_rates_active ON exchange_rates(active);
CREATE INDEX idx_wallet_activity_wallet_id ON wallet_activity_logs(wallet_id);
```

---

## 🔌 API ENDPOINTS SPECIFICATION

### 1. Get Wallet
```
GET /api/v1/wallets/:currency
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "currency": "USD",
    "available_balance": 1500.00,
    "pending_balance": 250.00,
    "frozen_balance": 0.00,
    "total_balance": 1750.00,
    "status": "active",
    "daily_send_limit": 5000.00,
    "monthly_send_limit": 50000.00,
    "created_at": "2026-07-01T10:00:00Z"
  }
}
```

### 2. Get All Wallets
```
GET /api/v1/wallets
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "currency": "USD", "total_balance": 1750.00, ... },
    { "currency": "LRD", "total_balance": 85000.00, ... }
  ]
}
```

### 3. Create Wallet (Auto-created on first login, but endpoint available)
```
POST /api/v1/wallets
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet created successfully",
  "data": { ...wallet_data }
}
```

### 4. Get Wallet Balance History
```
GET /api/v1/wallets/:currency/balance-history?limit=30&offset=0
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-07-04",
      "balance": 1750.00,
      "transactions_count": 5,
      "incoming": 500.00,
      "outgoing": -250.00
    }
  ]
}
```

### 5. Get Wallet Transactions
```
GET /api/v1/wallets/:currency/transactions?limit=50&offset=0&status=completed
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "transfer",
      "amount": 100.00,
      "currency": "USD",
      "status": "completed",
      "from_user": { "id": "uuid", "phone_number": "+231...", "name": "John" },
      "to_user": { "id": "uuid", "phone_number": "+231...", "name": "Jane" },
      "description": "Payment for services",
      "created_at": "2026-07-04T12:00:00Z",
      "completed_at": "2026-07-04T12:00:05Z"
    }
  ]
}
```

### 6. Update Wallet Limits (Admin)
```
PATCH /api/v1/wallets/:id/limits
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "daily_send_limit": 10000.00,
  "monthly_send_limit": 100000.00,
  "daily_receive_limit": 50000.00,
  "monthly_receive_limit": 500000.00
}
```

### 7. Freeze Wallet (Admin)
```
POST /api/v1/wallets/:id/freeze
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "reason": "Suspicious activity detected"
}
```

### 8. Unfreeze Wallet (Admin)
```
POST /api/v1/wallets/:id/unfreeze
Authorization: Bearer <admin_token>
```

### 9. Get Exchange Rates
```
GET /api/v1/exchange-rates?from=USD&to=LRD
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from_currency": "USD",
    "to_currency": "LRD",
    "rate": 168.50,
    "updated_at": "2026-07-04T10:00:00Z"
  }
}
```

### 10. Recalculate Balance
```
POST /api/v1/wallets/:id/recalculate-balance
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Balance recalculated",
  "data": {
    "old_balance": 1750.00,
    "new_balance": 1750.00,
    "discrepancies": 0
  }
}
```

---

## 🔐 SECURITY REQUIREMENTS

### Financial Security
- ✅ All balances calculated from immutable ledger
- ✅ No direct balance modification allowed
- ✅ Double-entry bookkeeping for transfers
- ✅ Transaction atomic operations (all or nothing)
- ✅ Idempotency keys to prevent duplicate transactions
- ✅ Holds system to reserve amounts during processing

### Access Control
- ✅ Users can only view their own wallets
- ✅ Users cannot modify wallet limits
- ✅ Admin-only freeze/unfreeze operations
- ✅ Admin-only exchange rate management
- ✅ Audit logging for all wallet changes

### Balance Integrity
- ✅ Balance reconciliation jobs
- ✅ Automatic discrepancy detection
- ✅ Manual balance verification endpoints
- ✅ Historical balance tracking
- ✅ Immutable transaction records

---

## 🛠️ IMPLEMENTATION PLAN

### Phase 1: Setup & Core Models (Week 1)
- [x] Database schema design
- [ ] Create database migration file
- [ ] Create Wallet model
- [ ] Create WalletTransaction model
- [ ] Create ExchangeRate model
- [ ] Create WalletActivityLog model

### Phase 2: Services & Business Logic (Week 1-2)
- [ ] WalletService for wallet operations
- [ ] BalanceCalculationService for balance computation
- [ ] TransactionService for transaction handling
- [ ] ExchangeRateService for currency conversion
- [ ] LimitEnforcementService for limit checks
- [ ] ReconciliationService for balance verification

### Phase 3: Controllers & Routes (Week 2)
- [ ] WalletController
- [ ] TransactionController
- [ ] ExchangeRateController
- [ ] Admin wallet endpoints
- [ ] Public endpoints
- [ ] Protected endpoints

### Phase 4: Testing & Documentation (Week 2-3)
- [ ] Unit tests for services
- [ ] Integration tests for API endpoints
- [ ] Security tests for limits and access
- [ ] Balance calculation tests
- [ ] API documentation
- [ ] Database documentation

---

## 📊 KEY CONCEPTS

### Balance Calculation
```javascript
// Pseudocode for balance calculation
function calculateBalance(walletId) {
  const completedTransactions = await getTransactions(
    walletId, 
    status: 'completed'
  );
  
  const availableBalance = completedTransactions.reduce(
    (sum, txn) => sum + txn.amount, 0
  );
  
  const pendingTransactions = await getTransactions(
    walletId,
    status: 'pending'
  );
  
  const pendingBalance = pendingTransactions.reduce(
    (sum, txn) => sum + txn.amount, 0
  );
  
  const holds = await getActiveHolds(walletId);
  const frozenBalance = holds.reduce(
    (sum, hold) => sum + hold.amount, 0
  );
  
  return {
    available: availableBalance,
    pending: pendingBalance,
    frozen: frozenBalance,
    total: availableBalance + pendingBalance + frozenBalance
  };
}
```

### Transaction Types
```
1. TRANSFER - User to user transfer
2. MERCHANT_PAYMENT - Payment to merchant
3. AGENT_CASH_IN - Agent deposits cash
4. AGENT_CASH_OUT - Agent withdraws cash
5. REFUND - Return of funds
6. REVERSAL - Undo a transaction
7. FEE - Service fee deduction
8. BONUS - Reward or bonus credit
```

### Wallet Status Transitions
```
ACTIVE
  ├─→ FROZEN (admin freezes for investigation)
  │    └─→ ACTIVE (admin unfreezes)
  ├─→ SUSPENDED (user hits limits, auto-suspend)
  │    └─→ ACTIVE (limits reset or manual)
  └─→ CLOSED (user deletes account)
       └─ Cannot reopen
```

---

## 🎯 SUCCESS CRITERIA

✅ **All wallets created automatically** on user registration  
✅ **Balance calculations accurate** within milliseconds  
✅ **Transactions immutable** once completed  
✅ **Limits enforced** before transaction processing  
✅ **Holds work correctly** for in-flight transactions  
✅ **Reconciliation jobs** pass validation  
✅ **No race conditions** in concurrent operations  
✅ **API response times** < 200ms for balance queries  
✅ **Audit trail complete** for all wallet operations  
✅ **Admin controls functional** for wallet management  

---

## 📋 DELIVERABLES CHECKLIST

- [ ] Database migration script
- [ ] 6 database models
- [ ] 5 services (Wallet, Transaction, Balance, Exchange, Reconciliation)
- [ ] 3 controllers (Wallet, Transaction, ExchangeRate)
- [ ] 10+ API endpoints
- [ ] Comprehensive tests
- [ ] Complete API documentation
- [ ] Database schema documentation
- [ ] Security implementation guide
- [ ] Deployment guidelines

---

**Status:** Ready for implementation  
**Branch:** `module/wallet-management`  
**Next Step:** Begin Phase 1 implementation
