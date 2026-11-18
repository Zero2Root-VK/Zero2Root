---
title: "Web & API Testing Tools"
description: "Proxy analysis, request replay, controlled fuzzing, API testing, ZAP automation and evidence capture."
---

## 1. Choose the right tool for the task

| Tool | Primary use | Key capability |
|---|---|---|
| [Burp Suite](https://portswigger.net/burp/documentation/contents) | Manual and automated web testing | Proxy, HTTP history, Repeater, Intruder and (Professional) Scanner |
| [OWASP ZAP](https://www.zaproxy.org/docs/) | Proxy-based testing and automation | Passive analysis, spidering, active scanning and Automation Framework |
| [ffuf](https://github.com/ffuf/ffuf) | Content and parameter discovery | Fast HTTP fuzzing with matchers, filters and rate controls |
| [Gobuster](https://github.com/OJ/gobuster) | Directory, DNS and virtual-host discovery | Wordlist-based enumeration |
| [sqlmap](https://sqlmap.org/) | SQL injection verification in approved tests | Automated DBMS-specific detection and validation |
| [curl](https://curl.se/docs/) | Precise HTTP request reproduction | Explicit headers, methods, bodies, cookies and response capture |
| [jq](https://jqlang.org/manual/) | JSON processing | Extract and transform API and scanner output |

## 2. Burp Suite — manual application analysis

Burp is most useful when the tester can understand and manipulate the actual application request/response sequence.

### Establish a safe project

1. Create a separate project for the engagement or test environment.
2. Configure the target scope before crawling or scanning.
3. Use Burp's browser or a deliberately configured browser profile.
4. Confirm the proxy listener and certificate are configured only for the intended test device.
5. Disable interception when normal browsing is needed; keep the HTTP history for evidence.
6. Never install Burp's CA certificate as a trusted root on a personal or production device beyond the approved test setup.

### Core tools

- **Proxy:** intercepts, inspects and modifies HTTP(S) traffic. Review the official [Proxy documentation](https://portswigger.net/burp/documentation/desktop/tools/proxy).
- **Target / Site map:** organises the discovered application surface and scope.
- **Repeater:** sends controlled, manually modified requests. Use it to compare a baseline with one changed variable at a time.
- **Intruder:** automates customised request variation. Configure payload count, concurrency and throttling conservatively.
- **Comparer / Decoder:** assists with response differences and data representation.
- **Scanner:** Burp Scanner's automated crawling and auditing are available in Burp Suite Professional; feature availability differs by edition.

### Repeatable Repeater method

1. Capture a normal request from a dedicated test account.
2. Save the baseline request and response.
3. Change one property only: object identifier, role, method, content type or security-relevant parameter.
4. Keep the same session context unless session behaviour is the thing being tested.
5. Compare status, response body, headers and server-side effects.
6. Repeat with a second controlled test identity when testing authorisation.
7. Record the precise evidence and restore any modified test data.

Do not treat a changed status code alone as proof of a broken access control issue. Confirm whether the protected object or action was actually accessible.

## 3. OWASP ZAP — baseline and automation

ZAP supports manual proxy testing and automated workflows.

### Baseline scan

The ZAP Baseline scan runs a spider and waits for passive scanning. It does not perform active attack tests; that makes it useful as a low-impact starting point for CI or a permitted preliminary review.

~~~bash
mkdir -p evidence/zap
docker run --rm -t \
  -v "$PWD/evidence/zap:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://app.example.test -J baseline.json -r baseline.html
~~~

Review the current [ZAP Docker Baseline Scan documentation](https://www.zaproxy.org/docs/docker/baseline-scan/) for the image tag and supported report flags. Keep the output directory mounted so reports survive container exit.

### Automation Framework

For repeatable plans, ZAP's Automation Framework uses a YAML plan to define the environment, authentication, session management, jobs and tests. Generate a plan with the installed ZAP version's template/help options, review it, then validate it before running it.

Active scan jobs send attack payloads. Use them only on explicitly approved test systems with a known test account, bounded duration and a rollback plan. Do not assume that a baseline scan and an active scan have the same impact.

## 4. ffuf — controlled content discovery

ffuf can discover directories and files by substituting the `FUZZ` keyword in a URL.

~~~bash
ffuf -w /path/to/approved-wordlist.txt \
  -u https://app.example.test/FUZZ \
  -rate 5 \
  -mc 200,204,301,302,307,401,403 \
  -of json -o evidence/ffuf.json
~~~

The wordlist path is a local placeholder. Choose a small, relevant list first. Establish baseline behaviour for a random path before deciding which response codes, sizes or word counts are meaningful. Applications may return the same custom 200 response for every unknown path.

Useful concepts:

- **Matchers** select responses to display.
- **Filters** remove responses that match a known noise pattern.
- **Rate** caps request rate; thread count controls concurrent workers.
- **Output format** preserves results for later comparison.

Do not automatically filter every 404, 403 or 200 response. First confirm the application's normal response patterns. See the [ffuf matcher/filter guide](https://github.com/ffuf/ffuf/wiki).

## 5. Gobuster — focused enumeration

Gobuster provides directory/file, DNS and virtual-host modes. Select one mode per task, use an approved wordlist and keep concurrency within the agreed limit. Review the installed version's `gobuster help` output; command flags differ between modes and releases.

Directory enumeration can trigger WAF alerts and application logs. A discovered path may be an old route, a soft-404 or a redirect rather than an accessible resource.

## 6. sqlmap — bounded SQL injection validation

sqlmap automates SQL injection detection and exploitation. Its power means it must be used with particular care.

For an isolated lab or explicitly approved test request, a narrow starting shape is:

~~~bash
sqlmap -r evidence/request.txt -p id --batch --risk=1 --level=1
~~~

- The request file should be captured from the test application and reviewed before replay.
- `-p id` limits testing to the named parameter.
- The default risk and level are conservative starting points; increasing them can produce more intrusive tests.
- Do not use database enumeration, dumping, file access, operating-system takeover, tamper scripts or data modification unless those exact activities are authorised.

Prefer manual evidence first. Confirm that the vulnerable parameter is reachable and that the result is not caused by a WAF, caching layer or application error. Do not expose real customer data in a proof of concept.

## 7. curl — minimal, reproducible HTTP evidence

curl is useful for creating a small request that can be reviewed and repeated without a GUI.

~~~bash
curl --silent --show-error \
  --dump-header evidence/response.headers \
  --output evidence/response.body \
  --max-time 15 \
  https://app.example.test/
~~~

For authenticated requests, use a protected cookie/header file and keep secrets out of shell history and shared logs. Avoid adding `-k` / `--insecure` as a routine workaround: it disables certificate verification and can conceal TLS issues.

For API testing, capture the method, URL, content type, request body, authentication context, response code and response body. Do not place access tokens in screenshots or public logs.

## 8. API-specific workflow

For REST, GraphQL and other HTTP APIs:

1. Import the approved OpenAPI/Swagger definition or API collection.
2. Verify that the definition matches the deployed version.
3. Create at least two test users with distinct roles and synthetic records.
4. Map authentication and authorisation boundaries: object, function, property and tenant.
5. Test one controlled request variation at a time.
6. Validate rate limits, pagination, error handling, mass assignment and sensitive response properties where in scope.
7. Preserve the request/response pair and identity context for each result.

A schema import is an inventory aid, not proof that every route or role is covered. Include undocumented endpoints discovered during the approved workflow.

## 9. Common pitfalls

- **Scope drift:** proxy history or a crawler follows a link to an unrelated domain. Configure scope and verify redirects.
- **Session mismatch:** a request is tested with an expired or wrong-role session. Re-capture a valid baseline.
- **Soft 404:** the app returns a generic page for unknown paths. Compare random paths and response fingerprints.
- **WAF interference:** a block page is mistaken for an application response. Preserve evidence and coordinate with the owner.
- **Scanner-only conclusion:** a passive or active alert is reported without independent confirmation. Reproduce it.
- **Unsafe automation:** a scanner sends state-changing requests. Use a test environment and exclude destructive paths.

## Official references

- [Burp Suite documentation](https://portswigger.net/burp/documentation/contents)
- [Burp Proxy](https://portswigger.net/burp/documentation/desktop/tools/proxy)
- [OWASP ZAP documentation](https://www.zaproxy.org/docs/)
- [ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)
- [ZAP Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/)
- [ffuf Wiki](https://github.com/ffuf/ffuf/wiki)
- [Gobuster](https://github.com/OJ/gobuster)
- [sqlmap](https://sqlmap.org/)
- [curl documentation](https://curl.se/docs/)
