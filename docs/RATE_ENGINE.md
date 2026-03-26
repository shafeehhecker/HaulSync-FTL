# L1/L2 Rate Optimization Engine

## How It Works

When an RFQ window closes (or `POST /ftl/rfqs/:id/award` is called), the engine:

1. Fetches all `PENDING` bids for the RFQ
2. Filters out bids from vendors with `slaScore < minSLAScore`
3. Sorts remaining bids ascending by `rateAmount`
4. Assigns ranks: `1 = L1`, `2 = L2`, `3+ = L3...`
5. Sets statuses: `L1 → AWARDED`, `L2 → STANDBY`, `L3+ → REJECTED`
6. Updates `FtlRFQ.awardedBidId = L1.id` and `status = AWARDED`
7. If `awardStrategy = L1_AUTO`, auto-creates a `FtlTrip` for the L1 vendor

If L1 later rejects the load (or is unavailable), the trip can be manually reassigned to the L2 (STANDBY) vendor via the tracking UI.

---

## Award Strategies

| Strategy | Behaviour |
|----------|-----------|
| `L1_AUTO` | Lowest qualified bid wins automatically; trip created immediately |
| `L1_MANUAL_APPROVAL` | Lowest bid is ranked but requires a MANAGER to approve before trip creation |
| `NEGOTIATED` | RFQ closes without auto-award; manager negotiates directly |
| `CONTRACT_RATE` | No bidding; rate is taken from the pre-negotiated contract on file |

---

## RFQ Configuration Reference

```json
{
  "awardStrategy":    "L1_AUTO",
  "rfqWindowMinutes": 45,
  "minSLAScore":      70
}
```

| Field | Type | Description |
|-------|------|-------------|
| `awardStrategy` | enum | See table above |
| `rfqWindowMinutes` | int | How long the RFQ accepts bids (15–1440) |
| `minSLAScore` | float | Vendors with score below this are ineligible (0–100) |

---

## Vendor SLA Score

Each `Company` (transporter) has a `slaScore` field (0–100, default 80). This score is updated based on historical trip performance:

- On-time delivery → score increases
- Delayed delivery → score decreases
- SLA breach exception → score decreases significantly
- Trip rejection after award → score penalty

The `slaScore` is used as the eligibility gate in L1/L2 ranking. It is also displayed as a progress bar on each bid in the RFQ detail view.

---

## Fallback Logic

```
RFQ closes → L1 awarded
     │
     ▼ (L1 rejects / goes unavailable)
     │
     ▼
MANAGER reassigns trip to L2 (STANDBY bid)
     │
     ▼ (L2 also unavailable)
     │
     ▼
New RFQ can be raised from the same indent
```

Automatic L2 fallback (no manual step) can be enabled per RFQ by setting `fallbackStrategy: "L2_AUTO"` — this is on the roadmap and not yet implemented in the current release.

---

## API Quick Reference

```bash
# Publish RFQ (starts the window)
POST /api/ftl/rfqs
{ "awardStrategy": "L1_AUTO", "rfqWindowMinutes": 45, "minSLAScore": 70, ... }

# Vendor submits bid
POST /api/ftl/rfqs/:id/bids
{ "rateAmount": 28500 }

# Manually trigger award (before window closes)
POST /api/ftl/rfqs/:id/award
```
