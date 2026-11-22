# SYRIA AI — Execution Roadmap

Thirteen phases from technical discovery to production hardening. Statuses are maintained in [PROJECT_STATUS.md](PROJECT_STATUS.md).

| Phase | Title | Gate (acceptance criteria) |
|---|---|---|
| 0 | Technical discovery | System audit + architecture proposal + risk register |
| 1 | Repository & engineering foundation | Project installable; initial tests run on documented dev environment |
| 2 | Original neural model | Weights actually change during training; no external checkpoint ever loaded |
| 3 | Tokenizer & data pipeline | Every sample traceable with clear license state |
| 4 | First successful pretraining | Model reloads from fresh checkpoint and generates without external models |
| 5 | Architecture research (SDSA) | Actual results documented whether the hypothesis is supported or refuted |
| 6 | SYRIA AI Nano | Trained model reproducible and evaluable, limits documented |
| 7 | Inference engine | Independent inference from SYRIA AI weights (sampling, streaming, params) |
| 8 | API backend | Full HTTP→model→HTTP integration test passes |
| 9 | Web & dashboards | All interfaces connected to real services; unfinished states explicit |
| 10 | Specialized models | Documented improvement on domain tasks without unacceptable base regression |
| 11 | Open-source research release | Independent researcher can reproduce the release on documented resources |
| 12 | Production hardening | Security review, load tests, monitoring, backups pass defined operating criteria |

## Rules that apply across phases

- Small-first gating: Debug → Nano → Mini → Base → Pro. No large run starts before smaller gates pass.
- Evaluation sets stay separate from training data; benchmarks publish only with method + config + data version.
- Compute honesty: hardware assumptions are never stated beyond what has been measured.
- Every failure is logged, isolated, fixed and re-tested — never papered over.

## SDSA research note

The Syria Dual-State Architecture (language representation state + structured world state + learned fusion) remains an experimental branch. It will only be adopted for stable releases if matched evaluation (similar params/FLOPs/data) shows reproducible benefit over the Decoder-Only baseline.
