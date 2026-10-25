"""Identidad de publicación de Document♥s. VERSION sigue siendo la fuente de la versión."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIR = ROOT / "distribution" / "runtime"
REPO = "qargath/Documentos"
IMAGE = "ghcr.io/qargath/documentos"
VERSION_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
PLACEHOLDER = "__DOCUMENTOS_VERSION__"

RUNTIME_FILES = (
    ".env.example",
    "compose.yaml",
    "install.bat",
    "Actualizar.bat",
    "restart.bat",
    "documentos-runtime.ps1",
)

ZIP_FILES = ("VERSION",) + RUNTIME_FILES


def read_version() -> str:
    raw = (ROOT / "VERSION").read_text(encoding="utf-8")
    version = raw.strip()
    if "\n" in version or "\r" in version or raw not in (version, f"{version}\n", f"{version}\r\n"):
        raise SystemExit("VERSION debe ser una sola línea, sin espacios ni comentarios.")
    if not VERSION_PATTERN.fullmatch(version):
        raise SystemExit("VERSION debe ser MAJOR.MINOR.PATCH, sin la letra v.")
    return version


def tag_for(version: str) -> str:
    return f"v{version}"
