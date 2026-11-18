#!/usr/bin/env python3
"""Bounded HTTP metadata inventory for an explicitly approved host list."""

from __future__ import annotations

import argparse
import ipaddress
import json
import logging
import os
import re
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

LOG = logging.getLogger("z2r_http_inventory")


@dataclass(frozen=True)
class Target:
    raw_url: str
    scheme: str
    host: str
    port: int
    origin: str
    path_present: bool
    query_parameters_present: bool


def canonical_host(value: str) -> str:
    """Return a canonical ASCII hostname or compressed IP literal."""
    host = value.strip()
    if host.endswith("."):
        host = host[:-1]
    if not host or "%" in host:
        raise ValueError("invalid or empty hostname")

    try:
        return ipaddress.ip_address(host).compressed
    except ValueError:
        pass

    try:
        ascii_host = host.encode("idna").decode("ascii").lower()
    except UnicodeError as exc:
        raise ValueError("hostname cannot be converted to IDNA") from exc

    if len(ascii_host) > 253:
        raise ValueError("hostname exceeds 253 characters")

    labels = ascii_host.split(".")
    label_pattern = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
    if any(not label_pattern.fullmatch(label) for label in labels):
        raise ValueError("hostname contains an invalid DNS label")
    return ascii_host


def load_allowlist(path: Path) -> set[str]:
    allowed: set[str] = set()
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        value = raw.split("#", 1)[0].strip()
        if not value:
            continue
        try:
            allowed.add(canonical_host(value))
        except ValueError as exc:
            raise ValueError(f"{path}:{line_number}: {exc}") from exc

    if not allowed:
        raise ValueError("host allowlist is empty")
    return allowed


def parse_allowed_ports(value: str) -> set[int]:
    ports: set[int] = set()
    try:
        for item in value.split(","):
            port = int(item.strip())
            if not 1 <= port <= 65535:
                raise ValueError
            ports.add(port)
    except ValueError as exc:
        raise ValueError("allowed ports must be comma-separated integers from 1 to 65535") from exc

    if not ports:
        raise ValueError("at least one allowed port is required")
    return ports


def parse_target(raw_url: str, allowed_hosts: set[str], allowed_ports: set[int]) -> Target:
    value = raw_url.strip()
    if not value or any(ord(char) <= 32 or ord(char) == 127 for char in value):
        raise ValueError("URL is empty or contains whitespace/control characters")

    try:
        parts = urlsplit(value)
        scheme = parts.scheme.lower()
        hostname = parts.hostname
        port = parts.port
    except ValueError as exc:
        raise ValueError("URL is malformed") from exc

    if scheme not in {"http", "https"} or not parts.netloc or not hostname:
        raise ValueError("only absolute HTTP or HTTPS URLs are accepted")
    if parts.username is not None or parts.password is not None:
        raise ValueError("credentials must not be embedded in a URL")
    if parts.fragment:
        raise ValueError("URL fragments are not accepted")

    host = canonical_host(hostname)
    if host not in allowed_hosts:
        raise ValueError(f"host is not in the exact allowlist: {host}")

    effective_port = port if port is not None else (443 if scheme == "https" else 80)
    if effective_port not in allowed_ports:
        raise ValueError(f"port {effective_port} is not in the allowed-port list")

    display_host = f"[{host}]" if ":" in host else host
    origin = f"{scheme}://{display_host}:{effective_port}"
    return Target(
        raw_url=value,
        scheme=scheme,
        host=host,
        port=effective_port,
        origin=origin,
        path_present=parts.path not in {"", "/"},
        query_parameters_present=bool(parts.query),
    )


def load_targets(
    path: Path,
    allowed_hosts: set[str],
    allowed_ports: set[int],
    max_targets: int,
) -> list[Target]:
    targets: list[Target] = []
    seen: set[str] = set()

    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        value = raw.strip()
        if not value or value.startswith("#"):
            continue
        try:
            target = parse_target(value, allowed_hosts, allowed_ports)
        except ValueError as exc:
            raise ValueError(f"{path}:{line_number}: {exc}") from exc

        if target.raw_url in seen:
            continue
        seen.add(target.raw_url)
        targets.append(target)

        if len(targets) > max_targets:
            raise ValueError(f"target count exceeds --max-targets ({max_targets})")

    if not targets:
        raise ValueError("target list is empty")
    return targets


def build_session() -> requests.Session:
    retry = Retry(
        total=1,
        connect=1,
        read=0,
        status=1,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.trust_env = False  # Do not silently inherit an environment proxy.
    session.headers.update({"User-Agent": "Zero2Root-Authorized-Inventory/1.0"})
    return session


def redirect_details(
    target: Target,
    location: str | None,
    allowed_hosts: set[str],
    allowed_ports: set[int],
) -> tuple[str | None, bool | None]:
    if not location:
        return None, None

    try:
        redirected = urlsplit(urljoin(target.raw_url, location))
        if not redirected.hostname:
            return None, False
        host = canonical_host(redirected.hostname)
        port = redirected.port
        effective_port = port if port is not None else (
            443 if redirected.scheme.lower() == "https" else 80
        )
        in_allowlist = host in allowed_hosts and effective_port in allowed_ports
        return host, in_allowlist
    except ValueError:
        return "unparseable", False


def scan_one(
    session: requests.Session,
    target: Target,
    connect_timeout: float,
    read_timeout: float,
    allowed_hosts: set[str],
    allowed_ports: set[int],
) -> dict[str, object]:
    started = time.perf_counter()
    try:
        with session.get(
            target.raw_url,
            timeout=(connect_timeout, read_timeout),
            allow_redirects=False,
            verify=True,
            stream=True,
        ) as response:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            redirect_host, redirect_allowed = redirect_details(
                target,
                response.headers.get("Location"),
                allowed_hosts,
                allowed_ports,
            )
            return {
                "origin": target.origin,
                "path_present": target.path_present,
                "query_parameters_present": target.query_parameters_present,
                "method": "GET",
                "status_code": response.status_code,
                "response_time_ms": elapsed_ms,
                "server": response.headers.get("Server"),
                "content_type": response.headers.get("Content-Type"),
                "content_length": response.headers.get("Content-Length"),
                "redirect_host": redirect_host,
                "redirect_host_in_allowlist": redirect_allowed,
                "tls_verification": "enabled",
            }
    except requests.RequestException as exc:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        LOG.warning("Request failed for %s (%s)", target.host, type(exc).__name__)
        return {
            "origin": target.origin,
            "path_present": target.path_present,
            "query_parameters_present": target.query_parameters_present,
            "method": "GET",
            "status_code": None,
            "response_time_ms": elapsed_ms,
            "error_type": type(exc).__name__,
            "tls_verification": "enabled",
        }


def write_json_atomic(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_name = handle.name
            os.chmod(temp_name, 0o600)
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Collect bounded HTTP response metadata from exact allowlisted hosts."
    )
    parser.add_argument("--input", required=True, type=Path, help="One approved HTTP(S) URL per line")
    parser.add_argument("--allow-hosts", required=True, type=Path, help="Exact hostname/IP allowlist")
    parser.add_argument("--output", required=True, type=Path, help="JSON output path")
    parser.add_argument("--allowed-ports", default="80,443", help="Comma-separated allowed ports (default: 80,443)")
    parser.add_argument("--connect-timeout", type=float, default=3.05)
    parser.add_argument("--read-timeout", type=float, default=10.0)
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between requests (default: 1)")
    parser.add_argument("--max-targets", type=int, default=100)
    parser.add_argument("--validate-only", action="store_true", help="Validate and print origins without sending requests")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.connect_timeout <= 0 or args.read_timeout <= 0:
        parser.error("timeouts must be greater than zero")
    if args.delay < 0:
        parser.error("--delay cannot be negative")
    if args.max_targets < 1:
        parser.error("--max-targets must be at least 1")
    try:
        allowed_ports = parse_allowed_ports(args.allowed_ports)
        allowed_hosts = load_allowlist(args.allow_hosts)
        targets = load_targets(args.input, allowed_hosts, allowed_ports, args.max_targets)
    except (OSError, UnicodeError, ValueError) as exc:
        LOG.error("%s", exc)
        return 2

    resolved_paths = {args.input.resolve(), args.allow_hosts.resolve()}
    if args.output.resolve() in resolved_paths:
        LOG.error("Output path must not overwrite the input or host allowlist")
        return 2

    if args.validate_only:
        for target in targets:
            print(target.origin)
        LOG.info("Validated %d target(s); no network requests sent", len(targets))
        return 0

    os.umask(0o077)
    results: list[dict[str, object]] = []
    with build_session() as session:
        for index, target in enumerate(targets):
            if index:
                time.sleep(args.delay)
            results.append(
                scan_one(
                    session,
                    target,
                    args.connect_timeout,
                    args.read_timeout,
                    allowed_hosts,
                    allowed_ports,
                )
            )

    payload: dict[str, object] = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "target_count": len(targets),
        "results": results,
    }
    try:
        write_json_atomic(args.output, payload)
    except OSError as exc:
        LOG.error("Unable to write output: %s", type(exc).__name__)
        return 2

    LOG.info("Wrote %d result(s) to %s", len(results), args.output)
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    raise SystemExit(main())
