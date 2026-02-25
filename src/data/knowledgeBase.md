# ABC Bank - Chargeback Lifecycle Management

## Process Overview

The Chargeback Lifecycle process manages end-to-end dispute resolution for ABC Bank's cardholders. When a cardholder disputes a transaction, the AI agent evaluates the claim, determines whether to file a chargeback, files it on the Visa Resolve Online (VROL) portal, and handles merchant representments.

## Key Stages

### 1. Dispute Intake
- Cardholder reports a disputed charge via mobile banking, phone, or branch visit
- Agent captures transaction details, cardholder claim, and supporting evidence
- System flags high-value transactions (>$10,000) for enhanced review

### 2. Fraud Screening
- Automated checks: device fingerprint, IP geolocation, velocity analysis
- Cross-reference with cardholder transaction history
- Identify friendly fraud indicators (legitimate transactions disputed by cardholder)

### 3. Chargeback Decision (Reasoning)
The AI agent evaluates multiple factors to recommend whether to file:
- **Reason code eligibility** - Does the claim match a valid Visa reason code?
- **Timeline compliance** - Is the dispute within the 120-day Visa window?
- **Evidence strength** - Does the evidence support the cardholder's claim?
- **Cost-benefit analysis** - Is the amount worth the filing cost?
- **Prior resolution attempts** - Did the cardholder try to resolve with the merchant?

### 4. Chargeback Filing (Browser Agent)
- Agent logs into Visa Resolve Online (VROL) portal
- Creates new dispute with transaction details and reason code
- Uploads evidence package
- Submits and records case reference number
- Issues provisional credit to cardholder

### 5. Representment Handling (Document Extraction)
When a merchant submits a representment:
- **Extract** data from rebuttal letters, shipping confirmations, product listings
- **Cross-reference** delivery signatures against cardholder names
- **Analyze** customer correspondence for complaint timelines
- **Score** each evidence piece against reason code requirements
- **Generate** recommendation (uphold or reverse chargeback)

### 6. Human-in-the-Loop (HITL)
Human approval is required when:
- AI confidence is below 70% on filing decision
- High-value transactions exceed $10,000
- Friendly fraud probability exceeds 50%
- Representment evidence evaluation is ambiguous
- Override of AI recommendation is needed

## Reason Codes

| Code | Category | Description |
|------|----------|-------------|
| 10.4 | Fraud | Other Fraud - Card Absent Environment |
| 11.1 | Authorization | Card Recovery Bulletin |
| 12.1 | Processing | Late Presentment |
| 13.1 | Consumer | Merchandise/Services Not Received |
| 13.3 | Consumer | Not as Described/Defective Merchandise |

## Evidence Requirements by Reason Code

### 13.1 - Not Received
- No delivery confirmation or tracking
- Merchant failed retrieval request
- Cardholder statement of non-receipt

### 13.3 - Not as Described
- Product description vs actual product evidence
- Photos showing discrepancy
- Customer complaint correspondence
- Return attempt documentation

### 10.4 - Fraud (Card Absent)
- 3D Secure authentication status
- Device fingerprint analysis
- IP and geolocation data
- Transaction pattern analysis

## Compliance Requirements
- All filings must comply with Visa network operating regulations
- Response deadlines: 30 days for merchant, 120 days for filing window
- Audit trail required for every decision (AI + human)
- Human overrides must be documented with rationale
- Chargeback ratio monitored under Visa VDMP program (threshold: 0.9%)

## Key Metrics
- Target chargeback win rate: >68%
- Average processing time: <4 hours per case
- HITL intervention rate: ~15% of cases
- Representment denial rate: ~55%
