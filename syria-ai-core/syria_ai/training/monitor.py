"""Hardware monitoring — honest CPU/RAM/GPU reporting.

GPU values come ONLY from real detection (torch.cuda / nvidia-smi).
If no GPU exists the report says exactly: "No GPU detected". Nothing is
simulated, ever.
"""

from __future__ import annotations

import shutil
import subprocess

import psutil
import torch


def gpu_report() -> dict:
    gpus = []
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            free, total = torch.cuda.mem_get_info(i)
            gpus.append(
                {
                    "index": i,
                    "name": props.name,
                    "total_memory_mb": round(props.total_memory / 1024 / 1024, 1),
                    "free_memory_mb": round(free / 1024 / 1024, 1),
                }
            )
    if not gpus:
        # second chance: nvidia-smi (covers headless drivers torch may miss)
        try:
            out = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5,
            )
            if out.returncode == 0 and out.stdout.strip():
                for i, line in enumerate(out.stdout.strip().splitlines()):
                    name, total, used = [x.strip() for x in line.split(",")]
                    gpus.append(
                        {
                            "index": i,
                            "name": name,
                            "total_memory_mb": float(total),
                            "used_memory_mb": float(used),
                        }
                    )
        except Exception:
            pass
    return {
        "available": bool(gpus),
        "devices": gpus,
        "message": "GPU detected" if gpus else "No GPU detected",
        "backend": "torch.cuda" if torch.cuda.is_available() else ("nvidia-smi" if gpus else "none"),
    }


def cpu_report() -> dict:
    load = psutil.getloadavg() if hasattr(psutil, "getloadavg") else (0, 0, 0)
    return {
        "physical_cores": psutil.cpu_count(logical=False),
        "logical_cores": psutil.cpu_count(logical=True),
        "percent": psutil.cpu_percent(interval=0.1),
        "freq_mhz": (psutil.cpu_freq().current if psutil.cpu_freq() else None),
        "load_avg_1m": round(load[0], 2),
        "arch": os_arch(),
    }


def os_arch() -> str:
    import platform

    return f"{platform.system()} {platform.machine()}"


def ram_report() -> dict:
    vm = psutil.virtual_memory()
    return {
        "total_gb": round(vm.total / 1024**3, 2),
        "available_gb": round(vm.available / 1024**3, 2),
        "used_gb": round(vm.used / 1024**3, 2),
        "percent": vm.percent,
        "process_rss_mb": round(psutil.Process().memory_info().rss / 1024**2, 1),
    }


def disk_report(path: str = ".") -> dict:
    du = shutil.disk_usage(path)
    return {
        "total_gb": round(du.total / 1024**3, 2),
        "free_gb": round(du.free / 1024**3, 2),
        "percent": round(du.used / du.total * 100, 1),
    }


def full_hardware_report(path: str = ".") -> dict:
    gpu = gpu_report()
    cpu = cpu_report()
    ram = ram_report()
    disk = disk_report(path)
    return {
        "gpu": gpu,
        "cpu": cpu,
        "memory": ram,
        "disk": disk,
        "device_for_training": "cuda" if gpu["available"] else "cpu",
        "summary": (
            f"GPU: {gpu['message']}; "
            f"CPU: {cpu['logical_cores']} logical cores ({cpu['arch']}); "
            f"RAM: {ram['total_gb']} GB total / {ram['available_gb']} GB available"
        ),
    }
