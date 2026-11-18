import tempfile
import unittest
from pathlib import Path

import requests

from http_inventory import (
    canonical_host,
    load_targets,
    parse_allowed_ports,
    parse_target,
    scan_one,
)


class FakeResponse:
    status_code = 302
    headers = {
        "Location": "https://outside.example.test/reset?token=SHOULD_NOT_LEAK",
        "Server": "test-server",
        "Content-Type": "text/plain",
        "Content-Length": "0",
    }

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeSession:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.kwargs = None

    def get(self, url, **kwargs):
        self.kwargs = kwargs
        if self.error:
            raise self.error
        return self.response


class HostAndTargetTests(unittest.TestCase):
    def setUp(self):
        self.allowed_hosts = {"app.example.test", "xn--bcher-kva.example"}
        self.allowed_ports = {80, 443, 8443}

    def test_canonical_host_lowercase_and_trailing_dot(self):
        self.assertEqual(canonical_host("APP.Example.Test."), "app.example.test")

    def test_canonical_host_idna(self):
        self.assertEqual(canonical_host("bücher.example"), "xn--bcher-kva.example")

    def test_canonical_ipv6(self):
        self.assertEqual(canonical_host("2001:db8::1"), "2001:db8::1")

    def test_rejects_invalid_dns_label(self):
        with self.assertRaises(ValueError):
            canonical_host("bad..example.test")

    def test_rejects_host_not_exactly_allowlisted(self):
        with self.assertRaisesRegex(ValueError, "exact allowlist"):
            parse_target("https://sub.app.example.test/", self.allowed_hosts, self.allowed_ports)

    def test_rejects_port_not_allowlisted(self):
        with self.assertRaisesRegex(ValueError, "allowed-port"):
            parse_target("https://app.example.test:9443/", self.allowed_hosts, self.allowed_ports)

    def test_rejects_url_credentials(self):
        with self.assertRaisesRegex(ValueError, "credentials"):
            parse_target("https://user:pass@app.example.test/", self.allowed_hosts, self.allowed_ports)

    def test_rejects_fragment(self):
        with self.assertRaisesRegex(ValueError, "fragments"):
            parse_target("https://app.example.test/#section", self.allowed_hosts, self.allowed_ports)

    def test_query_and_path_are_not_in_origin(self):
        target = parse_target(
            "https://app.example.test/reset/secret-token?auth=secret",
            self.allowed_hosts,
            self.allowed_ports,
        )
        self.assertEqual(target.origin, "https://app.example.test:443")
        self.assertTrue(target.path_present)
        self.assertTrue(target.query_parameters_present)
        self.assertNotIn("secret", target.origin)

    def test_port_parser(self):
        self.assertEqual(parse_allowed_ports("80,443,8443"), {80, 443, 8443})
        with self.assertRaises(ValueError):
            parse_allowed_ports("443,70000")

    def test_load_targets_deduplicates_and_enforces_maximum(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "targets.txt"
            path.write_text(
                "https://app.example.test/\nhttps://app.example.test/\n",
                encoding="utf-8",
            )
            targets = load_targets(path, {"app.example.test"}, {443}, 1)
            self.assertEqual(len(targets), 1)

            path.write_text(
                "https://app.example.test/\nhttps://app.example.test/health\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "max-targets"):
                load_targets(path, {"app.example.test"}, {443}, 1)


class RequestSafetyTests(unittest.TestCase):
    def setUp(self):
        self.target = parse_target(
            "https://app.example.test/reset?token=INPUT_SECRET",
            {"app.example.test"},
            {443},
        )

    def test_get_is_bounded_and_redirect_is_not_followed(self):
        session = FakeSession(response=FakeResponse())
        result = scan_one(session, self.target, 3.05, 10.0, {"app.example.test"}, {443})

        self.assertEqual(result["status_code"], 302)
        self.assertEqual(result["redirect_host"], "outside.example.test")
        self.assertFalse(result["redirect_host_in_allowlist"])
        self.assertFalse(session.kwargs["allow_redirects"])
        self.assertTrue(session.kwargs["verify"])
        self.assertTrue(session.kwargs["stream"])
        self.assertNotIn("SHOULD_NOT_LEAK", repr(result))
        self.assertNotIn("INPUT_SECRET", repr(result))

    def test_request_error_does_not_leak_exception_url(self):
        session = FakeSession(error=requests.ConnectionError("request failed: token=ERROR_SECRET"))
        result = scan_one(session, self.target, 3.05, 10.0, {"app.example.test"}, {443})
        self.assertEqual(result["error_type"], "ConnectionError")
        self.assertNotIn("ERROR_SECRET", repr(result))


if __name__ == "__main__":
    unittest.main()
