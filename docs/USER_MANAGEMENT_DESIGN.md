# Module 3: User Management & KYC System

**Status:** Design & Implementation Phase  
**Branch:** `module/user-management-extended`  
**Dependencies:** Module 1 (Auth) ✅ Module 2 (Wallet) ✅  
**Estimated Duration:** 2-3 weeks  

---

## 🎯 MODULE OVERVIEW

**Purpose:** Extend user profiles with comprehensive KYC (Know Your Customer) verification, document management, identity verification, and account tier classification.

**Core Concept:** Every user has an extended profile with KYC status tracking, identity documents, verification workflows, and account tier levels that determine wallet limits and features.

---

## 📋 KYC & VERIFICATION FLOW

### User Tier Progression
```
Tier 1: BASIC (Just registered)
   ├── Phone verified ✓
   ├── Email optional
   ├── Daily limit: $100 USD / 16,850 LRD
   └── No withdrawals allowed
        ↓
Tier 2: STANDARD (After KYC Lite)
   ├── Email verified
   ├── Name & DOB confirmed
   ├── Address optional
   ├── Daily limit: $1,000 USD / 168,500 LRD
   ├── Monthly limit: $10,000 USD
   └── Limited withdrawals
        ↓
Tier 3: PREMIUM (After Full KYC)
   ├── Full identity verification
   ├── Address verified
   ├── Document verification (ID, proof of address)
   ├── Daily limit: $5,000 USD / 842,500 LRD
   ├── Monthly limit: $50,000 USD
   └── Full access to all features
        ↓
Tier 4: MERCHANT (After merchant verification)
   ├── Business registration verified
   ├── Tax ID confirmed
   ├── Custom limits
   └── Merchant-specific features
```

### KYC Verification Stages
```
┌─────────────────────┐
│  UNVERIFIED         │
│  (Just registered)  │
└──────────┬──────────┘
           │ Submit KYC
           ↓
┌─────────────────────┐
│ PENDING_REVIEW      │
│ (Awaiting approval) │
└──────────┬──────────┘
           │ Auto-review / Manual review
           ├─→ APPROVED ✓
           └─→ REJECTED ✗
                │
                └─→ Can resubmit
```

---

## 🏛️ DATABASE SCHEMA

### User Profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  
  -- Personal Information
  date_of_birth DATE,
  gender VARCHAR(20),
  nationality VARCHAR(2), -- ISO country code
  
  -- Address Information
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2), -- ISO country code
  
  -- Professional/Business
  occupation VARCHAR(100),
  employer_name VARCHAR(255),
  business_name VARCHAR(255),
  business_type VARCHAR(100), -- sole_proprietor, partnership, corporation, etc
  business_registration_number VARCHAR(100),
  tax_id VARCHAR(50),
  
  -- Verification Status
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT TRUE, -- Verified during registration
  address_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  
  -- Account Tier
  account_tier VARCHAR(20) DEFAULT 'basic', -- basic, standard, premium, merchant
  tier_upgraded_at TIMESTAMP,
  
  -- Profile Completion
  profile_completion_percentage INT DEFAULT 10, -- 0-100
  required_fields_pending TEXT[], -- Array of missing required fields
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, restricted
  reason_for_suspension TEXT,
  suspended_at TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Identity Documents Table
```sql
CREATE TABLE identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Document Type
  document_type VARCHAR(50), -- passport, drivers_license, national_id, etc
  document_number VARCHAR(100),
  issuing_country VARCHAR(2),
  
  -- Document Details
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT, -- S3 URL to document image
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who verified
  rejection_reason TEXT,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Address Verification Table
```sql
CREATE TABLE address_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Document Type
  document_type VARCHAR(50), -- utility_bill, lease_agreement, bank_statement, etc
  document_url TEXT,
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### KYC Submissions Table
```sql
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Submission Details
  kyc_level VARCHAR(20), -- lite, full, merchant
  submission_data JSONB, -- All submitted data
  
  -- Review Status
  review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, manual_review
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  
  -- Auto-Review
  auto_review_passed BOOLEAN,
  auto_review_checks JSONB, -- Results of automated checks
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Preferences Table
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Transaction Notifications
  notify_on_send BOOLEAN DEFAULT TRUE,
  notify_on_receive BOOLEAN DEFAULT TRUE,
  notify_threshold DECIMAL(15,2), -- Only notify for transactions above this
  
  -- Security Settings
  require_pin_for_transfer BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  
  -- Preferences
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  currency_display VARCHAR(3) DEFAULT 'USD',
  
  -- Privacy
  profile_visibility VARCHAR(20) DEFAULT 'private', -- private, contacts_only, public
  show_online_status BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Beneficiaries Table
```sql
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  beneficiary_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Beneficiary Info
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  relationship VARCHAR(100), -- family, friend, business, etc
  
  -- Bank Account (for external transfers)
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  routing_number VARCHAR(20),
  swift_code VARCHAR(20),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(10), -- For verification
  verified_at TIMESTAMP,
  
  -- Transfer Limits
  daily_limit DECIMAL(15,2),
  monthly_limit DECIMAL(15,2),
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Emergency Contacts Table
```sql
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Contact Info
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  relationship VARCHAR(100),
  priority INT DEFAULT 1, -- Primary, secondary, etc
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Create Indexes
```sql
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_tier ON user_profiles(account_tier);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_identity_docs_user_id ON identity_documents(user_id);
CREATE INDEX idx_identity_docs_status ON identity_documents(verification_status);
CREATE INDEX idx_address_verif_user_id ON address_verifications(user_id);
CREATE INDEX idx_kyc_submissions_user_id ON kyc_submissions(user_id);
CREATE INDEX idx_kyc_submissions_status ON kyc_submissions(review_status);
CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_user_prefs_user_id ON user_preferences(user_id);
```

---

## 🔌 API ENDPOINTS SPECIFICATION

### User Profile Management

**1. Get User Profile**
```
GET /api/v1/users/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "date_of_birth": "1990-01-15",
    "nationality": "LR",
    "address": { ... },
    "account_tier": "standard",
    "profile_completion_percentage": 75,
    "email_verified": true,
    "phone_verified": true,
    "identity_verified": false
  }
}
```

**2. Update User Profile**
```
PATCH /api/v1/users/profile
Authorization: Bearer <token>

Request:
{
  "date_of_birth": "1990-01-15",
  "nationality": "LR",
  "address_line_1": "123 Main Street",
  "city": "Monrovia",
  "state_province": "Montserrado",
  "postal_code": "1000",
  "country": "LR"
}
```

**3. Get Profile Completion Status**
```
GET /api/v1/users/profile/completion
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "completion_percentage": 75,
    "current_tier": "standard",
    "next_tier": "premium",
    "required_for_next_tier": [
      "Full identity verification",
      "Address verification"
    ],
    "estimated_time_to_next_tier": "7 days"
  }
}
```

### Identity & Document Management

**4. Upload Identity Document**
```
POST /api/v1/users/documents/identity
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request:
{
  "document_type": "passport",
  "document_number": "B12345678",
  "issuing_country": "LR",
  "issue_date": "2020-01-15",
  "expiry_date": "2030-01-15",
  "document_file": <file>
}
```

**5. Upload Address Verification Document**
```
POST /api/v1/users/documents/address
Authorization: Bearer <token>

Request:
{
  "document_type": "utility_bill",
  "address_document_file": <file>
}
```

**6. Get Document Status**
```
GET /api/v1/users/documents/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "identity_documents": [
      {
        "id": "uuid",
        "document_type": "passport",
        "verification_status": "verified",
        "verified_at": "2026-07-01T10:00:00Z"
      }
    ],
    "address_documents": [
      {
        "id": "uuid",
        "document_type": "utility_bill",
        "verification_status": "pending"
      }
    ]
  }
}
```

### KYC Verification

**7. Submit KYC**
```
POST /api/v1/users/kyc/submit
Authorization: Bearer <token>

Request:
{
  "kyc_level": "full",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "nationality": "LR",
  "address_line_1": "123 Main Street",
  "city": "Monrovia",
  "country": "LR",
  "employment_status": "employed",
  "occupation": "Software Engineer",
  "company_name": "Tech Corp"
}
```

**8. Get KYC Status**
```
GET /api/v1/users/kyc/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "current_level": "lite",
    "status": "approved",
    "approved_at": "2026-07-01T10:00:00Z",
    "next_level_required": "full",
    "submission_history": [ ... ]
  }
}
```

### Preferences & Settings

**9. Get User Preferences**
```
GET /api/v1/users/preferences
Authorization: Bearer <token>
```

**10. Update User Preferences**
```
PATCH /api/v1/users/preferences
Authorization: Bearer <token>

Request:
{
  "email_notifications": true,
  "sms_notifications": true,
  "language": "en",
  "timezone": "Africa/Monrovia",
  "currency_display": "USD"
}
```

### Beneficiaries Management

**11. Add Beneficiary**
```
POST /api/v1/users/beneficiaries
Authorization: Bearer <token>

Request:
{
  "name": "Jane Doe",
  "phone_number": "+231775555555",
  "relationship": "friend",
  "daily_limit": 1000.00,
  "monthly_limit": 10000.00
}
```

**12. Get Beneficiaries**
```
GET /api/v1/users/beneficiaries
Authorization: Bearer <token>
```

**13. Delete Beneficiary**
```
DELETE /api/v1/users/beneficiaries/:id
Authorization: Bearer <token>
```

### Emergency Contacts

**14. Add Emergency Contact**
```
POST /api/v1/users/emergency-contacts
Authorization: Bearer <token>

Request:
{
  "name": "John Doe (Father)",
  "phone_number": "+231775555556",
  "relationship": "family",
  "priority": 1
}
```

**15. Get Emergency Contacts**
```
GET /api/v1/users/emergency-contacts
Authorization: Bearer <token>
```

---

## 🔒 SECURITY & COMPLIANCE

✅ **Data Protection**
- PII (Personally Identifiable Information) encrypted at rest
- Document storage in S3 with encryption
- Access logging for all document views

✅ **KYC Compliance**
- Anti-Money Laundering (AML) checks
- Sanctions list screening
- Politically Exposed Person (PEP) screening

✅ **Document Verification**
- Manual review by compliance team
- Automated OCR for initial validation
- Expiry date tracking
- Document authenticity checks

✅ **Tier Progression**
- Automatic tier upgrades when requirements met
- Manual override for edge cases
- Tier downgrade for non-compliance

---

## 📊 ACCOUNT TIER LIMITS

| Feature | Basic | Standard | Premium | Merchant |
|---------|-------|----------|---------|----------|
| Daily Limit | $100 | $1,000 | $5,000 | Custom |
| Monthly Limit | $500 | $10,000 | $50,000 | Custom |
| Send Transfers | ✗ | ✓ | ✓ | ✓ |
| Receive Transfers | ✓ | ✓ | ✓ | ✓ |
| Merchant Payments | ✗ | Limited | ✓ | N/A |
| Withdrawals | ✗ | Limited | ✓ | ✓ |
| Beneficiaries | 0 | 5 | Unlimited | Unlimited |
| KYC Required | Phone | Lite | Full | Full+Business |

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Database & Models (Days 1-2)
- [ ] Database migration
- [ ] Create 6 models
- [ ] Add indexes

### Phase 2: Services & Logic (Days 3-5)
- [ ] ProfileService
- [ ] KYCService
- [ ] DocumentService
- [ ] PreferencesService
- [ ] BeneficiariesService

### Phase 3: Controllers & APIs (Days 6-8)
- [ ] ProfileController
- [ ] DocumentController
- [ ] KYCController
- [ ] PreferencesController
- [ ] BeneficiariesController

### Phase 4: Testing & Docs (Days 9-10)
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation

---

## ✅ SUCCESS CRITERIA

✅ All user profile data captured and stored  
✅ KYC verification workflow functional  
✅ Document upload and verification working  
✅ Account tier progression automatic  
✅ Tier limits enforced on transactions  
✅ User preferences customizable  
✅ Beneficiaries management functional  
✅ Emergency contacts management working  
✅ Compliance checks integrated  
✅ Full audit trail for all changes  

---

**Status:** Design Complete - Ready for Implementation  
**Branch:** `module/user-management-extended`  
**Next Step:** Begin Phase 1 implementation
