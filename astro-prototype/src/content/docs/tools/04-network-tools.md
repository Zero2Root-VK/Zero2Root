---
title: "Network Traffic & Protocol Analysis"
description: "Wireshark, TShark, tcpdump, netcat and Scapy for bounded protocol testing and packet evidence."
---

## 1. Select the right tool

| Tool | Primary purpose | Use it when |
|---|---|---|
| [Wireshark](https://www.wireshark.org/docs/wsug_html/) | Interactive packet inspection and protocol dissection | You need to explore flows, decode fields or correlate events |
| [TShark](https://www.wireshark.org/docs/man-pages/tshark.html) | Command-line packet analysis | You need repeatable extraction from PCAP/PCAPNG files |
| [tcpdump](https://www.tcpdump.org/manpages/tcpdump.1.html) | Packet capture with BPF filters | You need a small capture on a Linux/Unix interface |
| [netcat](https://man.openbsd.org/nc) | Basic TCP/UDP connectivity checks | You need to confirm whether a permitted service accepts a connection |
| [Scapy](https://scapy.readthedocs.io/en/stable/) | Programmatic packet creation and dissection | You need controlled protocol experiments or custom lab checks |
| `ip`, `ss`, `ip neigh` | Local interface, route, socket and neighbour state | You need to understand the tester host's network context |

## 2. Understand the two Wireshark filter languages

Capture filters and display filters are different languages and are applied at different stages.

| Filter type | When it runs | Example |
|---|---|---|
| Capture filter | Before packets are written to the capture file | `host 192.168.56.10 and tcp port 443` |
| Display filter | When viewing packets already captured | `ip.addr == 192.168.56.10 && tcp.port == 443` |

A capture filter reduces what is stored. A display filter only hides or shows packets in the current view; it does not remove them from the original capture.

### Useful display filters

~~~text
dns
tcp
udp
tls
tcp.port == 443
ip.addr == 192.168.56.10
dns.qry.name contains "example"
http.request
tls.handshake.type == 1
tcp.analysis.retransmission
~~~

Field availability depends on the protocol dissector and Wireshark version. Use the filter autocomplete and field reference rather than guessing field names.

## 3. Capture traffic with tcpdump

Capture only traffic needed for the approved test. The interface and host below are lab placeholders.

~~~bash
sudo tcpdump -i eth0 -nn -s 0 \
  -w evidence/app-https.pcap \
  'host 192.168.56.10 and tcp port 443'
~~~

- `-i eth0` selects the capture interface.
- `-nn` disables name and service resolution in the capture output.
- `-s 0` requests the full packet snap length supported by the capture implementation.
- `-w` writes a libpcap-format capture file (use the `.pcap` extension for this tcpdump example).
- The final expression is a Berkeley Packet Filter (BPF) capture filter.

The command above does not request PCAPNG output. If PCAPNG is specifically required, use Wireshark's `dumpcap` capture utility and follow its current command-line documentation rather than changing the extension of a tcpdump-generated file.

Check the active interface with `ip -br address` and routing with `ip route`. Do not capture all interfaces by default. Captures can contain cookies, session tokens, personal data and other sensitive payloads.

## 4. Inspect a capture with TShark

Read a saved capture and display only DNS packets:

~~~bash
tshark -r evidence/app-https.pcap -Y dns
~~~

Extract selected DNS fields into a tabular result:

~~~bash
tshark -r evidence/app-https.pcap -Y dns -T fields \
  -e frame.time -e ip.src -e ip.dst -e dns.qry.name \
  > evidence/dns-queries.tsv
~~~

The `-Y` option accepts a Wireshark display filter. It is not a BPF capture filter. Review field names against the TShark version installed.

## 5. Basic connectivity checks

A connection test is not a vulnerability test. It can confirm whether a TCP handshake succeeds from the tester's current network position.

~~~bash
nc -vz -w 3 192.168.56.10 443
~~~

This attempts a TCP connection to one host and port. Use only the approved service address. A successful connection does not establish which application is behind the port; follow up with service identification and application-level validation.

Local socket and route context can help explain unexpected results:

~~~bash
ip -br address
ip route
ss -lntup
ip neigh
~~~

## 6. Scapy for controlled protocol experiments

Scapy is a Python packet-manipulation library. It can create, send, capture and dissect packets. Use it in an isolated lab or a specifically authorised test segment.

For a basic ICMP reachability experiment against a lab host:

~~~python
from scapy.all import ICMP, IP, sr1

target = "192.168.56.10"  # Replace with an authorised lab host.
reply = sr1(IP(dst=target) / ICMP(), timeout=2, verbose=False)

if reply is None:
    print("No ICMP reply received; this does not prove the host is offline.")
else:
    print(reply.summary())
~~~

Run with the privileges required by your operating system and capture method. Do not use packet crafting to evade monitoring, spoof third-party addresses or disrupt a production segment.

## 7. A repeatable packet-analysis procedure

1. Record the capture point, interface, IP configuration and UTC start/end time.
2. Define the narrowest capture filter that answers the test question.
3. Start capture before reproducing the event.
4. Reproduce one action at a time and note its timestamp.
5. Stop capture promptly after the required event.
6. Apply display filters to analyse DNS, TCP, TLS or the relevant application protocol.
7. Export only the fields needed for the report; preserve the original capture separately.
8. Hash the original file and store it in the engagement evidence location.

## 8. Common interpretation mistakes

- **No packet observed:** the capture interface or vantage point may be wrong; traffic may be encrypted or routed elsewhere.
- **TCP retransmission:** this is evidence of transport behaviour, not by itself proof of a network vulnerability.
- **RST packet:** it can indicate a closed port or a connection reset by a middlebox or application.
- **TLS handshake failure:** identify the endpoint, SNI, negotiated protocol and alert before concluding why it failed.
- **Encrypted application traffic:** packet metadata may be visible even when payloads are not. Do not claim to have inspected encrypted HTTP content from a normal TLS capture.
- **Clock mismatch:** packet timestamps and application logs need compatible time sources before drawing event-order conclusions.

## 9. Evidence handling

Treat PCAP/PCAPNG files as sensitive. Limit access, encrypt storage and transfer, redact or extract only necessary fields, and apply the engagement retention schedule. Avoid capturing unrelated user traffic. If accidental sensitive data is captured, stop and follow the client evidence-handling procedure.

## Official references

- [Wireshark User's Guide](https://www.wireshark.org/docs/wsug_html/)
- [Wireshark display-filter reference](https://www.wireshark.org/docs/man-pages/wireshark-filter.html)
- [TShark manual](https://www.wireshark.org/docs/man-pages/tshark.html)
- [tcpdump manual](https://www.tcpdump.org/manpages/tcpdump.1.html)
- [OpenBSD netcat manual](https://man.openbsd.org/nc)
- [Scapy documentation](https://scapy.readthedocs.io/en/stable/)
