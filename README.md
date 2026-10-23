# RescueGrid AI — Autonomous Food Rescue & Redistribution Platform

> An agentic, food-safe redistribution platform that coordinates commercial surplus food donations with verified recipient shelters through intelligent recommendations, controlled automation, and certified delivery tracking.

---

## 1. Product Vision & Problem Statement

### The Problem
Every single day, restaurants, commercial caterers, corporate cafeterias, and college dining complexes discard tons of high-grade, safe surplus food. Concurrently, local soup kitchens, transitional shelters, and student emergency pantries struggle to secure adequate meals. 

Traditional food rescue fails because of three systemic barriers:
1. **Perishable Danger Zones (HACCP):** Cooked and hot-held foods (&gt;60°C) cool into bacterial growth zones (15°C–60°C) within hours. Manual phone calls and volunteer chat groups are far too slow.
2. **Silent Workflow Dropoffs:** When a shelter manager is at intake capacity and declines an offer, the donation sits in limbo until the food spoils.
3. **Unverified Estimations & "Greenwashing":** ESG and tax write-off reports rely on initial donor guestimates rather than certified weight scale receipts at the delivery dock.

### The Solution
**RescueGrid AI** introduces a closed-loop **Agentic AI architecture** with deterministic safety boundaries, controlled automation, automated decline recovery, and tamper-proof scale telemetry.

---

## 2. Orchestrated 5-Agent Architecture

RescueGrid AI enforces strict separation between deterministic safety guardrails and generative reasoning. LLMs are **never** permitted to override food safety rules, capacity limits, or expiration deadlines.

```
       [ Commercial Donor ]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│  Agent 1: Surplus Forecasting Engine                   │
│  • Historical catering time-series analysis            │
│  • Gemini contextual reasoning (banquets, weekends)    │
│  • Returns: Predicted kg, uncertainty range, factors   │
└───────────────────────────────────────┬────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────┐
│  Agent 2: Constrained Matching & Decision Support      │
│  • HARD FILTERS (Deterministic): Temp capability,     │
│    intake capacity margin, max radius, HACCP window    │
│  • AI RANKING: Gemini structured scoring (0-100)       │
│    [Distance 25% | Capacity 25% | Urgency 20% |        │
│     Reliability 15% | Mission Priority 15%]            │
└───────────────────────────────────────┬────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────┐
│  Agent 3: Perishable Route & Transit Planner           │
│  • Google Maps Platform Routes API (Traffic-Aware)     │
│  • Enforces critical transit windows:                  │
│    Hot foods: Max 45 mins | Cold foods: Max 60 mins    │
└───────────────────────────────────────┬────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────┐
│  Agent 4: Workflow Orchestration & Auto-Recovery       │
│  • Enforces Coordinator approvals & idempotency keys   │
│  • AUTOMATED DECLINE RECOVERY LOOP:                    │
│    Recipient Declines ➔ RECOVERY_PENDING ➔ Locates     │
│    next highest backup shelter ➔ Reassigns with audit  │
└───────────────────────────────────────┬────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────┐
│  Agent 5: Scale Verification & Impact Auditor          │
│  • Enforces certified scale receipts at delivery dock  │
│  • Calculates weight discrepancy (Initial vs Actual)   │
│  • Measures verified meals (0.42 kg/meal ReFED std)    │
│  • Calculates avoided carbon (2.5 kg CO2e / kg food)   │
│  • Streams verified records to BigQuery ESG dataset    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Workflow State Machine

RescueGrid AI enforces an explicit, auditable state machine with role-based transition security:

```
[ AVAILABLE ] ──(Run Matching)──► [ MATCHING ] ──(Propose Match)──► [ PROPOSED ]
      │                                                                   │
      │                                                      (Coordinator Approval)
      │                                                                   ▼
      │                                                             [ APPROVED ]
      │                                                                   │
      │                                                        (Recipient Action)
      │                                                       ┌───────────┴───────────┐
      │                                                       ▼                       ▼
      │                                                 [ ACCEPTED ]             [ DECLINED ]
      │                                                       │                       │
      │                                                (Driver Pickup)        (Agent 4 Recovery)
      │                                                       ▼                       ▼
      │                                             [ PICKUP_CONFIRMED ]     [ RECOVERY_PENDING ]
      │                                                       │                       │
      │                                               (Scale Verified)                │
      │                                                       ▼                       ▼
      │                                                [ DELIVERED ] ◄──(Reassigned Proposal)
      │                                                 (Terminal)
      ▼
[ CANCELLED / EXPIRED / FAILED ] (Terminal)
```

### Safety & Integrity Constraints:
- A `DELIVERED` donation is strictly terminal and cannot be modified or reassigned.
- An `EXPIRED` donation cannot be proposed or accepted.
- A recipient without sufficient daily capacity cannot be selected.
- All assignment mutations require unique **Idempotency Keys** to prevent duplicate approvals.
- Retrying API requests is completely idempotent.

---

## 4. Google Technologies Integration

| Google Technology | Purpose in RescueGrid AI | Status |
| :--- | :--- | :--- |
| **Google Gemini API** (`@google/genai`) | Powers **Agent 1** (Surplus Forecasting) & **Agent 2** (Constrained Match Reasoning & Explanation). Uses low temperature (0.2) with strict JSON schemas. | **Configured** with automatic deterministic fallback if key is omitted. |
| **Google Maps Platform Routes API** | Powers **Agent 3** (Transit Planning) with real-time traffic-aware route distance, duration, and waypoint calculation. | **Configured** with deterministic urban circuity (1.32x) fallback if key is omitted. |
| **Cloud Firestore** | Persistent schema for `donations`, `organizations`, `assignments`, `workflowEvents`, and `auditLogs`. | **Configured** with granular `firestore.rules` and in-memory persistent adapter. |
| **Google Cloud BigQuery** | Enterprise ESG analytics schema export (`rescuegrid_analytics_v1`) for real-time streaming ingestion. | **Configured** (Payload generator and schema definition ready). |
| **Google Cloud Run** | Containerized serverless deployment (`Dockerfile` & `cloudbuild.yaml`). | **Ready for deployment**. |

---

## 5. Transparency Disclosure: What is Real, Simulated, or Fallback

In accordance with hackathon evaluation standards, RescueGrid AI maintains complete architectural transparency:

1. **Deterministic Eligibility Engine (Real & Production-Ready):** Hard safety constraints (temperature equipment, capacity threshold, distance radius, operational hours) are 100% deterministic code running on the server.
2. **State Machine & Auto-Recovery (Real & Production-Ready):** The state machine, transition validator, idempotency guard, and Agent 4 decline recovery loop are fully functional and tested.
3. **Verified Scale Discrepancy Tracking (Real & Production-Ready):** Weight reconciliation and carbon conversion formulas adhere to EPA WARM and ReFED standards.
4. **Google Gemini API (Hybrid Real / Fallback):** When `GEMINI_API_KEY` is present in `.env.local`, live calls are made to `gemini-2.5-flash` using `@google/genai`. When unconfigured, the system executes an automated deterministic heuristic ranking engine, clearly badged as `DETERMINISTIC FALLBACK`.
5. **Google Maps Platform Routes API (Hybrid Real / Fallback):** When `GOOGLE_MAPS_API_KEY` is provided, live Routes API v2 calls compute traffic duration. When unconfigured, it executes an urban road circuity model (1.32x Haversine multiplier with synthetic road curvature waypoints), transparently badged as `SIMULATED ROAD MODEL (1.32x)`.
6. **Data Storage (Hybrid Firestore / Local Adapter):** Supports Google Cloud Firestore in production, and provides an in-memory/global persistent adapter for local development that survives hot reloads.

---

## 6. User Roles & Persona Switcher

The application features a built-in **Role Switcher** in the top navigation bar to test all user journeys without re-authenticating:

1. **Coordinator / Admin (`Elena Rostova`)**: Lead operations coordinator. Can approve consequential matches, monitor the city-wide grid, review audit trails, and manage partner organizations.
2. **Donor (`Chef Marcus Vance`)**: Executive Chef at Grand Plaza Caterers. Can list surplus food batches, declare food safety compliance, and track courier dispatches.
3. **Recipient Organization (`Sister Sarah Jenkins`)**: Director of Hope Community Kitchen. Can accept incoming food donations or decline (triggering automated backup recovery).
4. **Driver / Courier (`Alex Rivera`)**: EV Cargo Van courier. Confirms pickup temperature checks and records scale-verified delivery weights.

---

## 7. Step-by-Step Local Setup

### Prerequisites
- Node.js `v20.x` or `v24.x`
- npm `v10.x` or higher

### 1. Clone & Install
```bash
git clone <repo-url>
cd nmithack
npm install --legacy-peer-deps
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env.local
```
*(Optional)* Add your `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY`. If left empty, the application runs out-of-the-box in deterministic fallback mode.

### 3. Run Automated Tests
```bash
npm test
```
Runs 17 automated test suites verifying donation validation, deterministic eligibility constraints, state transitions, idempotency, failure recovery, and external fallbacks.

### 4. Build for Production
```bash
npm run build
```

### 5. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 8. Hackathon Demo Script (3-Minute Presentation Walkthrough)

To present RescueGrid AI to judges, follow this sequence:

### Step 1: The Problem & Live Impact (`/`)
- Open the Landing Page. Point out the **Integration Status Bar** at the top demonstrating transparency (Gemini API & Routes API status).
- Point out the **Live Verified Impact Counters**: `81.4 kg scale-verified rescued`, `194 meals provided`, `203.5 kg CO2 avoided`. Explain the critical distinction between **MEASURED** weights and **ESTIMATED** environmental conversions.

### Step 2: Listing Surplus with Food Safety Gates (`/donations/new`)
- Switch persona to **Donor (Chef Marcus)** using the top-right role switcher.
- Navigate to **"List Surplus Food"**.
- Fill in: `Basmati Rice & Paneer Curry Trays`, Category: `Cooked Meals`, Quantity: `40 kg`, Storage: `Hot-Held (>60°C)`.
- Note the **Food Safety Declaration**: Try submitting without checking the certification box—Zod validation blocks submission. Check the box and submit.

### Step 3: Constrained AI Matching & Decision Support (`/matching`)
- Switch persona to **Coordinator (Elena)**.
- Navigate to **AI Matching** and inspect the newly created listing.
- Show the **Deterministic Hard Rules Audit**: Point out that unverified organizations or organizations lacking hot-holding cambros are disqualified *before* any AI scoring occurs.
- Show the **Gemini AI Match Score Breakdown** (Distance 25%, Capacity 25%, Urgency 20%, Reliability 15%, Mission Priority 15%).
- Click **"Approve Assignment"** (protected by idempotency keys).

### Step 4: The Core Differentiator — Automated Decline Recovery (`/assignments`)
- Switch persona to **Recipient (Sister Sarah)**.
- Navigate to **Assignments**. Inspect the approved assignment.
- Click **"Recipient: Decline (Trigger Auto-Recovery)"**. Enter reason: *"Loading freezer emergency maintenance"*.
- **Watch Agent 4 in Action:** The state instantly moves to `DECLINED`, transitions to `RECOVERY_PENDING`, locates the next best eligible shelter (e.g. *Haven Family Transitional House*), and creates a reassignment proposal! **No food is left behind.**

### Step 5: Temperature Handover & Scale-Verified Delivery (`/assignments`)
- Switch persona to **Driver (Alex)**.
- Click **"Driver: Confirm Pickup & Temperature"**. Show temperature verification (e.g. `66.5°C`).
- Navigate to **Routes & Safety (`/routes`)** to view turn-by-turn waypoints and the HACCP perishable safety transit window (&lt;45 min buffer).
- Return to **Assignments** and click **"Confirm Scale-Verified Delivery"**. Enter verified weight: `41.2 kg`.
- Show the automatic discrepancy calculation (`+1.2 kg`) and certified meal/carbon update!

### Step 6: Governance, Audit Logs & BigQuery Export (`/admin` and `/analytics`)
- Navigate to **Analytics** to show the **BigQuery Streaming Ingestion Schema** and verified vs estimated breakdowns.
- Navigate to **Admin & Audit** to show the complete, immutable action log with actor roles, timestamps, and outcomes.

---

## 9. Automated Test Suite Summary

The application includes automated unit and integration tests (`tests/rescuegrid.test.ts`):
- `1.` Donation creation and Zod schema validation (date order checks, safety certification checks).
- `2.` Recipient deterministic eligibility (temperature equipment, capacity margin, service radius).
- `3.` State machine transition validation and terminal status protection (`DELIVERED` cannot be reassigned).
- `4.` Role-based authorization enforcement (Donor cannot approve assignment; only Coordinator can).
- `5.` Idempotency keys and duplicate approval prevention.
- `6.` Agent 4 automated decline recovery and alternative reassignment.
- `7.` Agent 5 temperature pickup gates and certified scale discrepancy calculation.
- `8.` Verified impact calculations (EPA WARM & ReFED formulas).
- `9.` External fallback engines (Gemini & Google Maps offline handling).

---

## 10. Remaining Limitations & Future Roadmap

1. **IoT Temperature Telemetry:** Currently temperature is audited and input by certified couriers at pickup dock; future iterations will integrate Bluetooth BLE thermal data-logger beacons into food transport totes.
2. **Direct FCM Push Notifications:** Web push simulated via in-app action feeds; direct Firebase Cloud Messaging integration for native iOS/Android courier notifications is planned for v2.
3. **Automated Barcode / QR Pallet Scanning:** Ready to integrate camera-based QR code scans for container handovers.

---

## 11. License & Authors

Built for hackathon demonstration with production-minded engineering principles.
- **Platform:** RescueGrid AI
- **Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Google Gemini API, Google Maps Platform Routes API, Firebase & Firestore, Google Cloud BigQuery.
