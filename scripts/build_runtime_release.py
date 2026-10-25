"""Arma el ZIP operativo y su SHA-256 a partir de VERSION."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path

from release_lib import IMAGE, PLACEHOLDER, REPO, ROOT, RUNTIME_DIR, RUNTIME_FILES, ZIP_FILES, read_version, tag_for

NOTES_LABELS = (
    ("added", "Novedades"),
    ("changed", "Cambios"),
    ("fixed", "Correcciones"),
)


class Package:
    def __init__(self, version: str, blob: bytes, notes: str) -> None:
        self.version = version
        self.name = f"documentos-runtime-{version}.zip"
        self.blob = blob
        self.sha256 = hashlib.sha256(blob).hexdigest()
        self.notes = notes


def build_package(*, require_tag: bool) -> Package:
    version = read_version()
    if require_tag:
        assert_tag(version)
    assert_repository()
    assert_notes(version)
    files = load_runtime_files(version)
    return Package(version, zip_bytes(files), release_notes(version))


def assert_tag(version: str) -> None:
    expected = tag_for(version)
    if os.environ.get("GITHUB_REF_TYPE") == "tag":
        current = os.environ.get("GITHUB_REF_NAME", "")
    else:
        try:
            current = subprocess.check_output(
                ["git", "describe", "--tags", "--exact-match", "HEAD"],
                cwd=ROOT,
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except subprocess.CalledProcessError:
            current = ""
    if current != expected:
        raise SystemExit(f"El tag debe ser exactamente {expected}. No se corrige después de publicar.")


def assert_repository() -> None:
    remote = os.environ.get("GITHUB_REPOSITORY", "")
    if remote and remote.lower() != REPO.lower():
        raise SystemExit(f"El repositorio de la Action debe ser {REPO}.")


def assert_notes(version: str) -> None:
    notes = json.loads((ROOT / "src" / "release-notes.json").read_text(encoding="utf-8"))
    package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    if package_json.get("version") != version:
        raise SystemExit("package.json no coincide con VERSION.")
    matches = [item for item in notes if item.get("version") == version]
    if len(matches) != 1 or notes[0].get("version") != version:
        raise SystemExit("La primera nota de la versión debe ser la de VERSION, y no puede repetirse.")


def load_runtime_files(version: str) -> dict[str, bytes]:
    found = sorted(path.name for path in RUNTIME_DIR.iterdir() if path.name != ".gitkeep")
    expected = sorted(RUNTIME_FILES)
    if found != expected:
        extra = sorted(set(found) - set(expected))
        missing = sorted(set(expected) - set(found))
        raise SystemExit(f"distribution/runtime/ no coincide con la lista permitida. Sobran: {extra or '-'}. Faltan: {missing or '-'}.")
    template = (RUNTIME_DIR / "compose.yaml").read_text(encoding="utf-8")
    if template.count(PLACEHOLDER) != 1 or "build:" in template:
        raise SystemExit("El Compose del cliente debe usar la versión de VERSION y no puede compilar.")
    rendered = template.replace(PLACEHOLDER, version)
    if "__" in rendered or f"{IMAGE}:{version}" not in rendered:
        raise SystemExit("La imagen del cliente no quedó con la etiqueta exacta de VERSION.")
    files: dict[str, bytes] = {"VERSION": f"{version}\n".encode("utf-8")}
    for name in RUNTIME_FILES:
        if name == "compose.yaml":
            files[name] = normalize(name, rendered.encode("utf-8"))
        else:
            files[name] = normalize(name, (RUNTIME_DIR / name).read_bytes())
    return files


def normalize(name: str, data: bytes) -> bytes:
    text = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    if name.endswith((".bat", ".ps1")):
        text = text.replace(b"\n", b"\r\n")
    elif not text.endswith(b"\n"):
        text += b"\n"
    return text


def zip_bytes(files: dict[str, bytes]) -> bytes:
    from io import BytesIO

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name in sorted(files):
            if name not in ZIP_FILES:
                raise SystemExit(f"Archivo fuera de la lista del paquete: {name}")
            info = zipfile.ZipInfo(filename=name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            info.create_system = 0
            info.external_attr = 0
            archive.writestr(info, files[name])
    missing = [name for name in ZIP_FILES if name not in files]
    if missing:
        raise SystemExit(f"Faltan archivos en el paquete: {missing}")
    return buffer.getvalue()


def release_notes(version: str) -> str:
    notes = json.loads((ROOT / "src" / "release-notes.json").read_text(encoding="utf-8"))
    entry = next(item for item in notes if item.get("version") == version)
    lines = [f"# Document♥s {version}", "", entry["title"], "", entry["date"], ""]
    for key, label in NOTES_LABELS:
        items = entry.get(key) or []
        if not items:
            continue
        lines.extend([f"## {label}", ""])
        lines.extend(f"- {item}" for item in items)
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    package = build_package(require_tag=not dry_run)
    out = ROOT / "dist" / "release"
    out.mkdir(parents=True, exist_ok=True)
    zip_path = out / package.name
    sha_path = out / f"{package.name}.sha256"
    notes_path = out / "notas.md"
    zip_path.write_bytes(package.blob)
    sha_path.write_text(f"{package.sha256}  {package.name}\n", encoding="utf-8", newline="\n")
    notes_path.write_text(package.notes, encoding="utf-8", newline="\n")
    print(f"{package.name} {package.sha256}")


if __name__ == "__main__":
    main()
