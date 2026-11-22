"""Run the full pytest suite and write a machine-readable JSON report.

Run:  python3 scripts/run_tests.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main() -> None:
    t0 = time.time()
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "-q"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=1800,
    )
    duration = time.time() - t0
    output = proc.stdout + proc.stderr
    # parse summary line like "5 failed, 27 passed in 12.34s"
    passed = failed = 0
    for token in output.replace(",", " ").split():
        pass
    import re

    m_pass = re.search(r"(\d+) passed", output)
    m_fail = re.search(r"(\d+) failed", output)
    m_err = re.search(r"(\d+) error", output)
    passed = int(m_pass.group(1)) if m_pass else 0
    failed = int(m_fail.group(1)) if m_fail else 0
    errors = int(m_err.group(1)) if m_err else 0
    report = {
        "suite": "syria-ai-core",
        "ran_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "exit_code": proc.returncode,
        "duration_sec": round(duration, 1),
        "all_passed": proc.returncode == 0,
        "output_tail": output[-4000:],
    }
    os.makedirs(os.path.join(ROOT, "artifacts", "test_reports"), exist_ok=True)
    with open(os.path.join(ROOT, "artifacts", "test_reports", "pytest.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(output)
    print(json.dumps({k: report[k] for k in ("passed", "failed", "errors", "all_passed", "duration_sec")}, indent=2))
    sys.exit(0 if proc.returncode == 0 else 1)


if __name__ == "__main__":
    main()
