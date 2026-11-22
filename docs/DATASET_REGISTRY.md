# Dataset Registry — SYRIA DATA ENGINE

Processing funnel (dashboard view): collection 11.9M → cleaning 11.2M → dedup 10.9M → license filter 10.8M → **training-ready 10.8M documents**.

| DS ID | Name (AR / EN) | Category | Lang | Docs | Tokens | License | Status |
|---|---|---|---|---:|---:|---|---|
| DS-001 | مدون اللهجات السورية والشامية / Syrian & Levantine Dialect Corpus | dialect | ar | 1.4M | 1.1B | Internal-Research | ready (v1.3) |
| DS-002 | مدون الويب العربي المُصفّى / Arabic Web Corpus | web | ar | 4.6M | 3.8B | ODC-BY | ready (v2.1) |
| DS-003 | لقطة الموسوعات العربية / Arabic Encyclopedia Snapshot | encyclopedia | ar | 1.1M | 0.9B | CC-BY-SA-3.0 | ready (v1.2) |
| DS-004 | المدون المرجعية الإنجليزية / English Reference Corpus | web | en | 2.2M | 2.6B | ODC-BY | ready (v1.4) |
| DS-005 | أرشيف إعادة الإعمار والاقتصاد / Reconstruction & Economy Archive | technical | mixed | 0.6M | 0.5B | Internal-Research | processing (v0.9) |
| DS-006 | مجموعة الكتب العربية / Arabic Books Collection | books | ar | 0.8M | 1.2B | Public-Domain | processing (v0.7) |
| DS-007 | الشيفرات والوثائق التقنية / Code & Technical Docs | code | mixed | 0.7M | 0.9B | Internal-Research | review (v0.4) |
| DS-008 | مجموعة التعليمات البشرية / Instruction Set (human-authored) | dialogue | mixed | 0.05M | 0.04B | CC-BY-4.0 | planned (v0.1) |

## Governance

- Every dataset carries source, license, version, quality score and dedup ratio in the registry (view + API).
- Datasets under review are **not** enabled for training until the license audit passes.
- Privacy filtering removes personal/medical/financial/refugee-record content at ingestion.
- Exclusion requests: contact the data governance track via the official website.
- The instruction set (DS-008) is human-authored and licensed — no external-model distillation is used to build it.
