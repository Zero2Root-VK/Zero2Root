# Windows, Active Directory & Identity Tools

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 06 · WINDOWS & IDENTITY</span>

Tools for understanding Windows hosts, Active Directory structure, identity relationships and authentication exposure. The default workflow is inventory and authorised read-only assessment—not credential extraction or remote execution.
</div>

## 1. What this guide covers

An identity assessment examines the relationship between users, groups, computers, service accounts, policies, trusts, permissions and authentication protocols. A single successful login does not show whether the identity configuration is safe.

| Tool | Role | Appropriate use |
|---|---|---|
| [NetExec](https://github.com/Pennyw0rth/NetExec) | Multi-protocol network and identity assessment | SMB/LDAP/WinRM/RDP service and permission checks within scope |
| [Impacket](https://github.com/fortra/impacket) | Python protocol library and example utilities | SMB, MSRPC, Kerberos and LDAP-focused protocol work |
| [BloodHound CE](https://bloodhound.specterops.io/) | Identity relationship analysis | Visualising permissions and potential privilege paths |
| [SharpHound](https://bloodhound.specterops.io/collect-data/ce-collection/sharphound) | BloodHound data collector | Collecting approved domain relationship data |
| [Microsoft Sysinternals](https://learn.microsoft.com/sysinternals/) | Windows diagnostics and administration | Process, service, log and host-state inspection |
| [ldapsearch](https://www.openldap.org/software/man.cgi?query=ldapsearch) | LDAP query utility | Direct directory queries with an approved bind identity |

Older material may refer to CrackMapExec (CME). For new work, review the current NetExec project and command help rather than assuming historical CME commands and modules are unchanged.

## 2. Safe assessment sequence

1. Confirm the domain, domain controllers, network ranges and approved test identities.
2. Establish time synchronisation and DNS context.
3. Perform service discovery against the approved domain controller and member systems.
4. Review LDAP and SMB configuration using an approved low-privilege account.
5. Collect only the directory information required by the scope.
6. Analyse group membership, delegation, ACLs, trusts and computer relationships.
7. Validate high-risk paths with the system owner and an approved test account.
8. Preserve collection metadata and securely dispose of sensitive exports.

## 3. NetExec — protocol-aware assessment

NetExec uses a protocol-first command structure. Its documentation describes the general form:

~~~bash
nxc <protocol> <target> [options]
~~~

For an authorised lab, an SMB share inventory with a dedicated test identity can use this command shape:

~~~bash
nxc smb 192.168.56.10 -u lab-user -p 'LAB-ONLY-PASSWORD' --shares
~~~

Replace the target and test credential with values approved for the lab. Do not put production credentials in shell history, scripts, screenshots or shared command logs. Prefer an approved credential-handling method supported by the current tool release.

NetExec supports many protocols and modules. Read the protocol's current help and module documentation before executing a module. Options that perform remote command execution, credential extraction, password testing or lateral movement are not general-purpose inventory commands and require separate explicit authorisation.

## 4. Impacket — protocol utilities

Impacket is a collection of Python classes and example tools that implement protocols including SMB, MSRPC and Kerberos. It is useful when you need protocol-level control or a specific directory/network operation.

For example, an authorised domain user inventory query can use the GetADUsers example:

~~~bash
GetADUsers.py -all -dc-ip 192.168.56.10 example.test/lab-user
~~~

Use the current Impacket installation's script names and `-h` output. The command may prompt for a password. Use only a dedicated test account, and limit the attributes collected to those required by the assessment.

Impacket also contains tools capable of highly sensitive operations, including credential dumping, relaying and remote execution. Those are excluded from the default workflow in this guide. Their availability in a tool package is not permission to use them.

## 5. BloodHound Community Edition and SharpHound

BloodHound CE models relationships between directory objects and permissions. SharpHound is a collector that gathers data for analysis.

A collection is not just a harmless screenshot operation: it generates directory queries and creates a dataset that can reveal identities, group membership, computer relationships and privilege paths. Before collection:

- Agree the collection method and time window with the domain owner.
- Use the approved collector build and collection scope.
- Avoid broad or intrusive collection methods unless explicitly required.
- Protect the output archive as sensitive identity information.
- Record collector version, collection method and domain context.
- Import into a controlled BloodHound CE instance and restrict access to the resulting graph.

For a lab, SharpHound's collection method can be configured from its current help. Choose a method appropriate to the engagement; do not copy an all-data collection option without understanding what it queries.

## 6. What to examine

A structured review may include:

- Privileged groups and nested membership.
- Service accounts, SPNs and account configuration.
- Kerberos encryption and pre-authentication settings.
- Delegation settings and trust boundaries.
- Group Policy links and security-relevant preferences.
- Local administrator assignments and workstation/server separation.
- LDAP signing/channel binding and SMB signing/encryption configuration.
- Stale, disabled and inactive accounts.
- Dangerous ACLs and ownership rights.
- Tiering and administrative path design.

Map each observation to the relevant policy or control. A graph path indicates a potential relationship, not necessarily a reliable exploit path in the current environment.

## 7. Evidence and false-positive control

For each finding, preserve:

- Domain and target context.
- Collection time, tool version and collector method.
- Relevant object identifiers and relationship edges.
- The exact right or configuration that creates the concern.
- Validation with a permitted test identity.
- Any path assumptions, filtered collection data or inaccessible objects.

Do not publish raw BloodHound datasets or directory exports in public repositories. They can expose a full organisation's identity structure.

## 8. Common problems

- **LDAP bind fails:** check DNS, domain controller selection, time synchronisation, account state and TLS requirements.
- **Kerberos errors:** verify clock skew, SPN, realm, DNS and KDC reachability.
- **SMB access denied:** distinguish a network reachability issue from an authentication or share permission issue.
- **BloodHound graph looks incomplete:** verify collector method, permissions, collection exclusions and import status.
- **Tool returns success but no findings:** an empty result may reflect permissions, filtering or unsupported configuration rather than absence of risk.

## Official references

- [NetExec repository](https://github.com/Pennyw0rth/NetExec)
- [NetExec Wiki](https://www.netexec.wiki/)
- [Impacket](https://github.com/fortra/impacket)
- [BloodHound CE documentation](https://bloodhound.specterops.io/)
- [SharpHound collection](https://bloodhound.specterops.io/collect-data/ce-collection/sharphound)
- [Microsoft Sysinternals](https://learn.microsoft.com/sysinternals/)
- [OpenLDAP ldapsearch manual](https://www.openldap.org/software/man.cgi?query=ldapsearch)
