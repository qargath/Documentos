"""Contratos del flujo de publicación. No construye imágenes."""

from __future__ import annotations

import json
import sys
import zipfile
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_runtime_release import build_package
from release_lib import IMAGE, PLACEHOLDER, REPO, ROOT, RUNTIME_DIR, RUNTIME_FILES, ZIP_FILES, read_version

DISTRIBUTION_FILES = (
    "preparar-equipo.bat",
    "preparar-equipo.ps1",
    "preinstalar.bat",
    "preinstalar.ps1",
)


def main() -> None:
    version = read_version()
    assert_distribution_tree()
    assert_identities(version)
    assert_compose_files(version)
    assert_scripts()
    assert_image_contract()
    first = build_package(require_tag=False)
    second = build_package(require_tag=False)
    if first.blob != second.blob or first.sha256 != second.sha256:
        raise SystemExit("El ZIP operativo no es determinista.")
    inspect_zip(first.blob, version)
    if version not in first.notes:
        raise SystemExit("Las notas de la Release no incluyen la versión.")
    print(f"flujo de publicación ok {version} {first.sha256}")


def assert_distribution_tree() -> None:
    distribution = ROOT / "distribution"
    found = sorted(path.name for path in distribution.iterdir())
    expected = sorted((*DISTRIBUTION_FILES, "runtime"))
    if found != expected:
        raise SystemExit(f"distribution/ tiene archivos fuera de la lista: {found}")
    runtime = sorted(path.name for path in RUNTIME_DIR.iterdir())
    if runtime != sorted(RUNTIME_FILES):
        raise SystemExit(f"distribution/runtime/ no coincide: {runtime}")


def assert_identities(version: str) -> None:
    package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    notes = json.loads((ROOT / "src" / "release-notes.json").read_text(encoding="utf-8"))
    if package_json["version"] != version:
        raise SystemExit("package.json no coincide con VERSION.")
    if notes[0]["version"] != version:
        raise SystemExit("La nota visible no coincide con VERSION.")
    for note in notes:
        if not isinstance(note.get("title"), str) or not note["title"].strip():
            raise SystemExit("Cada nota necesita un título.")
        date = note.get("date", "")
        if len(date) != 10 or date[4] != "-" or date[7] != "-":
            raise SystemExit("La fecha de la nota debe ser AAAA-MM-DD.")
        unknown = set(note) - {"version", "date", "title", "added", "changed", "fixed"}
        if unknown:
            raise SystemExit(f"Campo de nota no previsto: {sorted(unknown)}")


def assert_compose_files(version: str) -> None:
    dev = (ROOT / "compose.yaml").read_text(encoding="utf-8")
    client = (RUNTIME_DIR / "compose.yaml").read_text(encoding="utf-8")
    if "build:" not in dev:
        raise SystemExit("El Compose de desarrollo tiene que compilar el código local.")
    if "build:" in client or PLACEHOLDER not in client:
        raise SystemExit("El Compose del cliente no puede compilar y debe tomar la versión de VERSION.")
    if f":{version}" in client:
        raise SystemExit("El Compose del cliente no debe tener la versión escrita a mano.")
    for text, label in ((dev, "desarrollo"), (client.replace(PLACEHOLDER, version), "cliente")):
        if text.count("4173:8080") != 1:
            raise SystemExit(f"El Compose de {label} debe publicar solo 4173:8080.")
    if f"{IMAGE}:{PLACEHOLDER}" not in client:
        raise SystemExit("La imagen del cliente debe ser la del registro, con la etiqueta de VERSION.")


def assert_scripts() -> None:
    push = (ROOT / "gitpush.bat").read_text(encoding="utf-8")
    publish = (ROOT / "PublicarVersion.bat").read_text(encoding="utf-8")
    dev_restart = (ROOT / "restart.bat").read_text(encoding="utf-8")
    client_restart = (RUNTIME_DIR / "restart.bat").read_text(encoding="utf-8")
    update = (RUNTIME_DIR / "Actualizar.bat").read_text(encoding="utf-8")
    runtime = (RUNTIME_DIR / "documentos-runtime.ps1").read_text(encoding="utf-8")
    if "git tag" in push or "PublicarVersion" in push:
        raise SystemExit("gitpush.bat solo puede enviar la rama. No publica una versión.")
    for piece in ("refs/tags/v", "main", "status --porcelain", "ls-remote"):
        if piece not in publish:
            raise SystemExit(f"PublicarVersion.bat no cumple el contrato ({piece}).")
    if "--build" not in dev_restart or "ghcr.io" in dev_restart or "compose pull" in dev_restart:
        raise SystemExit("El restart.bat del repositorio debe compilar el Compose local.")
    if "docker compose" in update:
        raise SystemExit("Actualizar.bat no puede reiniciar ni descargar imágenes.")
    if "documentos-runtime.ps1" not in client_restart or " restart" not in client_restart:
        raise SystemExit("El restart.bat del cliente debe aplicar las imágenes publicadas.")
    if "docker compose pull" not in runtime or "up -d --wait --remove-orphans" not in runtime:
        raise SystemExit("El reinicio del cliente debe descargar las imágenes y después recrear los servicios.")
    pull_at = runtime.index("docker compose pull")
    up_at = runtime.index("docker compose up -d --wait --remove-orphans")
    if pull_at > up_at:
        raise SystemExit("La descarga de imágenes tiene que terminar antes de recrear los servicios.")
    update_body = runtime.split("function Update-App", 1)[1].split("function Restart-App", 1)[0]
    if "docker" in update_body.lower() or "Restart-App" in update_body:
        raise SystemExit("La actualización no puede tocar Docker ni reiniciar.")
    for name in ZIP_FILES:
        if name not in runtime:
            raise SystemExit(f"El actualizador no menciona {name}.")
    if REPO not in runtime or REPO not in (ROOT / "distribution" / "preinstalar.ps1").read_text(encoding="utf-8"):
        raise SystemExit("El cliente y el preinstalador deben consultar el mismo repositorio.")
    client_env = (RUNTIME_DIR / ".env.example").read_text(encoding="utf-8")
    root_env = (ROOT / ".env.example").read_text(encoding="utf-8")
    if "GITHUB_PAT" in client_env or "GHCR_TOKEN" in root_env:
        raise SystemExit("El .env de desarrollo y el del cliente no se mezclan.")


def assert_image_contract() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    nginx = (ROOT / "nginx.conf").read_text(encoding="utf-8")
    if "USER nginx" not in dockerfile.split("FROM nginxinc/nginx-unprivileged")[-1]:
        raise SystemExit("La imagen final tiene que ejecutarse como nginx, no como root.")
    if "listen 8080;" not in nginx or "location = /salud" not in nginx:
        raise SystemExit("nginx debe escuchar en 8080 y responder en /salud.")
    if "npm ci" not in dockerfile:
        raise SystemExit("La imagen debe instalar dependencias con npm ci.")


def inspect_zip(blob: bytes, version: str) -> None:
    with zipfile.ZipFile(BytesIO(blob)) as archive:
        names = archive.namelist()
        if names != sorted(ZIP_FILES):
            raise SystemExit(f"El ZIP no tiene la lista exacta: {names}")
        for info in archive.infolist():
            if info.date_time != (1980, 1, 1, 0, 0, 0) or info.create_system != 0 or info.compress_type != 0:
                raise SystemExit("El ZIP no es determinista.")
            if info.flag_bits & 0x1:
                raise SystemExit("El ZIP no debe ir cifrado.")
        version_file = archive.read("VERSION").decode("utf-8")
        if version_file != f"{version}\n":
            raise SystemExit("El VERSION del paquete no coincide.")
        compose = archive.read("compose.yaml").decode("utf-8")
        if PLACEHOLDER in compose or f"{IMAGE}:{version}" not in compose or "build:" in compose:
            raise SystemExit("El Compose empaquetado no quedó cerrado.")


if __name__ == "__main__":
    main()
