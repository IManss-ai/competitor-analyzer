# Requirements

## Active Requirements

| ID | Requirement | Status | Phase |
|----|-------------|--------|-------|
| REQ-01 | Monitor up to 7 competitor URLs weekly using Jina AI reader | Active | 1 |
| REQ-02 | Character-level diff detection (>100 net char on main text body) | Active | 1 |
| REQ-03 | GPT-4o-mini classifies each diff as pricing_change/feature_add/repositioning/minor_copy/no_change | Active | 1 |
| REQ-04 | GPT-4o-mini synthesizes 2-3 sentence brief per competitor per week | Active | 1 |
| REQ-05 | GPT-4o generates action drafts (retention email, copy suggestion, social response) for non-trivial changes | Active | 1 |
| REQ-06 | Web app with approval queue — action cards, one-click approve (copy to clipboard) | Active | 1 |
| REQ-07 | On-demand scan within 24h of signup (trial activation) | Active | 1 |
| REQ-08 | $99/mo Stripe subscription, 14-day free trial, card required at signup | Active | 1 |
| REQ-09 | Mailgun email delivery of Monday 8am weekly brief | Active | 1 |
| REQ-10 | Brand voice capture: store original_draft + edited_text + change_type in approved_actions table | Active | 1 |
| REQ-11 | Scheduled cron job Monday 8am per customer (APScheduler or Railway Cron) | Active | 1 |

## Traceability

| Req ID | Plan(s) | Status |
|--------|---------|--------|
| REQ-01 | 01-01 | Pending |
| REQ-02 | 01-01 | Pending |
| REQ-03 | 01-02 | Pending |
| REQ-04 | 01-02 | Pending |
| REQ-05 | 01-03 | Pending |
| REQ-06 | 01-05 | Pending |
| REQ-07 | 01-06 | Pending |
| REQ-08 | 01-06 | Pending |
| REQ-09 | 01-06 | Pending |
| REQ-10 | 01-05 | Pending |
| REQ-11 | 01-06 | Pending |
