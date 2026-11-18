# Mobile Application Testing Tools

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 05 · MOBILE APPLICATION SECURITY</span>

A practical toolchain for Android and iOS assessment, from package inspection and static analysis to runtime instrumentation and network testing.
</div>

## 1. Mobile testing workflow

A mobile application assessment normally combines:

1. Package and build identification.
2. Static review of manifest/plist, permissions, resources, code and embedded configuration.
3. Local data-storage and inter-process communication checks.
4. Network and certificate-handling assessment.
5. Runtime observation and instrumentation.
6. Validation of findings against the platform version and the application's actual execution path.

Use a dedicated test device or emulator and a test account. Rooted/jailbroken devices and runtime hooks change the test environment; record those conditions because they can affect application behaviour.

## 2. Core tools

| Tool | Platform / role | What it is useful for |
|---|---|---|
| [ADB](https://developer.android.com/tools/adb) | Android device bridge | Device state, package paths, shell, logs and app installation |
| [JADX](https://github.com/skylot/jadx) | Android static analysis | Reading decompiled DEX/Java-like code and resources |
| [Apktool](https://apktool.org/) | Android package reverse engineering | Manifest, resources and Smali inspection |
| [MobSF](https://mobsf.github.io/docs/) | Android/iOS automated analysis | Static analysis and supported dynamic-analysis workflows |
| [Frida](https://frida.re/docs/) | Dynamic instrumentation | Observing and instrumenting runtime behaviour |
| [Objection](https://github.com/sensepost/objection) | Runtime mobile exploration | Higher-level Frida-based testing workflows |
| [Ghidra](https://ghidra-sre.org/) | Native binary analysis | ARM/ARM64 library and binary reverse engineering |

No single tool proves that an application is secure or insecure. OWASP MASTG explicitly treats its tools as assistance for test cases, with false positives and false negatives requiring review.

## 3. Android Debug Bridge (ADB)

First confirm that the intended test device is connected and authorised:

~~~bash
adb devices -l
~~~

Inspect the Android release and package path:

~~~bash
adb shell getprop ro.build.version.release
adb shell pm path com.example.app
~~~

The package name is a placeholder. Confirm it from the application under test rather than guessing. Use `adb -s SERIAL` when more than one device is connected.

Capture logs around a specific test:

~~~bash
adb logcat -d -v threadtime > evidence/android-logcat.txt
~~~

Logs may contain personal data, session values or internal endpoints. Filter and redact before sharing. Do not upload raw logs to a public issue tracker.

To install a provided test build:

~~~bash
adb install -r app-under-test.apk
~~~

Use a package supplied for the assessment. Do not extract, modify or redistribute an application's proprietary package outside the authorised engagement.

## 4. Static analysis: JADX and Apktool

Decode an APK with JADX:

~~~bash
jadx -d evidence/jadx-output app-under-test.apk
~~~

Decode resources and Smali with Apktool:

~~~bash
apktool d app-under-test.apk -o evidence/apktool-output
~~~

Review at least:

- AndroidManifest.xml: exported components, permissions, intent filters, backup/debug settings and network security configuration.
- Source/decompiled code: hard-coded secrets, insecure cryptographic use, unsafe WebView configuration, exported component checks and sensitive logging.
- Resources and assets: API endpoints, feature flags, certificate pins, configuration files and test artefacts.
- Native libraries: examine relevant `.so` files with Ghidra or another compatible disassembler.

Decompilation is an approximation. Obfuscation, compiler transformations, reflection, native code and dynamic loading can hide or distort the original source logic. Validate important claims at runtime.

## 5. MobSF — automated analysis

MobSF supports static and dynamic analysis for mobile applications. It is useful for triage, structured reporting and identifying areas that need manual review.

Deploy it using the official installation method for the version being assessed. For Docker deployments, pin a known release and follow the official storage and configuration guidance rather than exposing an unprotected analysis service to a public interface.

Before uploading an APK or IPA:

- Confirm that the engagement permits use of the analysis platform.
- Check whether uploaded samples or reports leave the local environment.
- Use a dedicated isolated instance for client material.
- Retain the MobSF version and configuration.
- Validate every important warning manually.

Dynamic analysis requires a compatible target environment. Android emulator, rooted device, Frida Gadget and iOS support vary by MobSF release and platform version; follow the current dynamic-analysis documentation for the selected version.

## 6. Frida and Objection — runtime testing

Frida provides dynamic instrumentation for native and managed applications. Confirm the device connection:

~~~bash
frida-ps -U
~~~

Spawn a test application:

~~~bash
frida -U -f com.example.app
~~~

The target package must be installed on the connected authorised device, and the Frida client/server or Gadget arrangement must be compatible. Device architecture, operating-system version, root/jailbreak state and application protections can affect attachment.

Objection provides a higher-level interactive interface over Frida:

~~~bash
objection -g com.example.app explore
~~~

Runtime techniques such as method tracing, certificate-pinning tests and local-storage inspection should use a test build/account and a documented hypothesis. Do not treat bypassing a control in a modified lab environment as proof that the same bypass works on a stock device.

## 7. iOS considerations

The iOS toolchain depends on the device state and application distribution:

- Inspect the IPA, application bundle, Info.plist, entitlements and embedded frameworks.
- Use a macOS environment for Xcode tooling and the iOS Simulator.
- Runtime instrumentation generally requires a supported jailbroken device, a suitable Frida Gadget integration or another explicitly approved test arrangement.
- Record signing, provisioning and device state. A repackaged/resigned application may behave differently from the original distribution build.

Use current OWASP MASTG platform guidance to choose the test cases and verify tool compatibility.

## 8. Common problems

| Symptom | Likely cause | Check |
|---|---|---|
| ADB shows `unauthorized` | Device has not approved the host key | Unlock device and approve the USB debugging prompt |
| ADB shows no device | Driver, cable, USB mode or daemon issue | `adb devices -l`, USB debugging and host driver |
| JADX output is incomplete | Obfuscation, dynamic loading or native implementation | Compare with Smali, resources and runtime behaviour |
| Frida cannot attach | Version/architecture mismatch or app/device protection | Confirm client/server versions and target process state |
| MobSF dynamic analysis fails | Unsupported emulator/device configuration | Follow the exact MobSF release's supported target matrix |
| App crashes after repackaging | Signature checks or altered package integrity | Compare original and modified builds; document the test condition |

## 9. Mobile evidence checklist

- [ ] App identifier, version, build hash and platform version recorded.
- [ ] Device/emulator model and root/jailbreak state documented.
- [ ] Static-analysis tool versions and report retained.
- [ ] Relevant manifest/plist, code location or resource evidence identified.
- [ ] Runtime request/response and reproduction steps captured where applicable.
- [ ] Test account and synthetic data used.
- [ ] Findings manually validated and false positives addressed.
- [ ] Sensitive logs, tokens and user data redacted.

## Official references

- [Android Debug Bridge](https://developer.android.com/tools/adb)
- [OWASP MASTG Testing Tools](https://mas.owasp.org/MASTG/tools/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [MobSF documentation](https://mobsf.github.io/docs/)
- [Frida Quick-start](https://frida.re/docs/quickstart/)
- [JADX](https://github.com/skylot/jadx)
- [Apktool](https://apktool.org/)
- [Objection](https://github.com/sensepost/objection)
