import asyncio
import ssl
import socket
from datetime import datetime, timezone, timedelta

from app.schemas.report import SslResult, Finding
from app.schemas.analyzer import AnalyzerResult

# Warn when certificate expires within this many days
_EXPIRY_WARN_DAYS = 30


def _get_cert_info(hostname: str) -> dict:
    """
    Opens a TLS connection and returns the parsed certificate dict.
    Runs in a thread via asyncio.to_thread because ssl/socket are blocking.
    """
    ctx = ssl.create_default_context()
    with ctx.wrap_socket(
        socket.create_connection((hostname, 443), timeout=8),
        server_hostname=hostname,
    ) as conn:
        cert   = conn.getpeercert()
        cipher = conn.cipher()          # (name, protocol, bits)
        return {"cert": cert, "cipher": cipher}


def _parse_cert(hostname: str, info: dict) -> SslResult:
    cert   = info["cert"]
    cipher = info.get("cipher")

    # Subject — take CN from the subject tuple list
    subject_cn = ""
    for field in cert.get("subject", ()):
        for key, val in field:
            if key == "commonName":
                subject_cn = val

    # Issuer
    issuer_o = ""
    for field in cert.get("issuer", ()):
        for key, val in field:
            if key == "organizationName":
                issuer_o = val

    # Validity dates — format: "May 12 00:00:00 2026 GMT"
    valid_from_raw = cert.get("notBefore", "")
    valid_to_raw   = cert.get("notAfter",  "")

    fmt = "%b %d %H:%M:%S %Y %Z"
    try:
        valid_from = datetime.strptime(valid_from_raw, fmt).replace(tzinfo=timezone.utc)
        valid_to   = datetime.strptime(valid_to_raw,   fmt).replace(tzinfo=timezone.utc)
        days_remaining = (valid_to - datetime.now(timezone.utc)).days
    except ValueError:
        valid_from = datetime.now(timezone.utc)
        valid_to   = datetime.now(timezone.utc)
        days_remaining = 0

    # SAN — Subject Alternative Names
    san_domains: list[str] = [
        val for kind, val in cert.get("subjectAltName", ())
        if kind == "DNS"
    ]

    # TLS version from cipher tuple: cipher[1] is the protocol string
    cipher_name = cipher[0] if cipher else None
    protocol = cipher[1] if cipher else None
    cipher_bits = cipher[2] if cipher and len(cipher) > 2 else None

    warning = None
    if days_remaining < 0:
        warning = f"Certificate expired {abs(days_remaining)} day(s) ago."
    elif days_remaining < _EXPIRY_WARN_DAYS:
        warning = f"Certificate expires in {days_remaining} day(s)."

    evidence = [
        f"issuer: {issuer_o or 'Unknown'}",
        f"subject: {subject_cn or hostname}",
        f"valid_from: {valid_from.isoformat()}",
        f"valid_to: {valid_to.isoformat()}",
        f"protocol: {protocol or 'Unknown'}",
    ]
    if cipher_name:
        evidence.append(f"cipher: {cipher_name}")
    if san_domains:
        evidence.append(f"san_count: {len(san_domains)}")

    return SslResult(
        httpsAvailable=True,
        issuer=issuer_o or "Unknown",
        subject=subject_cn or hostname,
        validFrom=valid_from.isoformat(),
        validTo=valid_to.isoformat(),
        daysRemaining=max(0, days_remaining),
        sanDomains=san_domains,
        trusted=True,   # ssl.create_default_context() validates chain — if we got here, it's trusted
        protocol=protocol,
        cipherName=cipher_name,
        cipherBits=cipher_bits,
        tlsConfidence="high",
        certificateEvidence=evidence,
        warning=warning,
    )


def _build_findings(result: SslResult) -> list[Finding]:
    findings: list[Finding] = []

    if not result.httpsAvailable:
        findings.append(Finding(
            id="no_https",
            severity="high",
            category="SSL",
            title="HTTPS Not Available",
            description="The domain does not respond on port 443 or the TLS handshake failed.",
            impact="All traffic is sent in plaintext and can be intercepted or modified.",
            recommendation="Obtain an SSL/TLS certificate and configure HTTPS. Consider Let's Encrypt for free certificates.",
            status="fail",
            confidence="observed",
            source="tls",
            evidence=result.certificateEvidence,
        ))
        return findings

    if not result.trusted:
        findings.append(Finding(
            id="ssl_untrusted",
            severity="high",
            category="SSL",
            title="SSL Certificate Is Not Trusted",
            description="The TLS handshake reached a server certificate, but certificate verification failed.",
            impact="Browsers may warn users or block access because the certificate chain, hostname, or validity could not be trusted.",
            recommendation="Install a certificate trusted by major browsers and ensure the certificate matches the scanned hostname.",
            status="fail",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))
        return findings

    if result.daysRemaining == 0:
        findings.append(Finding(
            id="ssl_expired",
            severity="high",
            category="SSL",
            title="SSL Certificate Expired",
            description=f"The certificate for {result.subject} has expired.",
            impact="Browsers will show a security warning and block access for most users.",
            recommendation="Renew the SSL certificate immediately.",
            status="fail",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))
    elif result.daysRemaining < _EXPIRY_WARN_DAYS:
        findings.append(Finding(
            id="ssl_expiring_soon",
            severity="medium",
            category="SSL",
            title=f"SSL Certificate Expiring Soon ({result.daysRemaining} days)",
            description=f"The certificate expires on {result.validTo[:10]}.",
            impact="If not renewed, users will see browser security warnings.",
            recommendation="Renew the certificate before expiry. Enable auto-renewal if using Let's Encrypt.",
            status="warning",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))
    else:
        findings.append(Finding(
            id="ssl_valid",
            severity="info",
            category="SSL",
            title="SSL Certificate Is Valid",
            description=f"Certificate is trusted, valid for {result.daysRemaining} more day(s). Protocol: {result.protocol}.",
            recommendation="No action required. Monitor expiration date.",
            status="pass",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))

    if result.protocol in {"TLSv1", "TLSv1.1", "SSLv3", "SSLv2"}:
        findings.append(Finding(
            id="tls_legacy_protocol",
            severity="high",
            category="SSL",
            title="Legacy TLS Protocol Negotiated",
            description=f"The scanner negotiated {result.protocol}, which is obsolete for modern HTTPS.",
            impact="Legacy TLS versions have known weaknesses and may fail modern client or compliance requirements.",
            recommendation="Disable SSLv2, SSLv3, TLS 1.0, and TLS 1.1. Prefer TLS 1.2 and TLS 1.3.",
            status="fail",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))
    elif result.protocol == "TLSv1.2":
        findings.append(Finding(
            id="tls12_supported",
            severity="info",
            category="SSL",
            title="TLS 1.2 Is Negotiated",
            description="The scanner negotiated TLS 1.2. This is acceptable, though TLS 1.3 is preferred when available.",
            recommendation="Keep TLS 1.2 enabled for compatibility and enable TLS 1.3 when supported by the server platform.",
            status="info",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))

    if result.cipherBits is not None and result.cipherBits < 128:
        findings.append(Finding(
            id="tls_weak_cipher",
            severity="high",
            category="SSL",
            title="Weak TLS Cipher Negotiated",
            description=f"The negotiated cipher provides only {result.cipherBits} bits of security.",
            impact="Weak ciphers can reduce confidentiality and may be rejected by modern clients.",
            recommendation="Disable weak cipher suites and prefer modern AEAD ciphers.",
            status="fail",
            confidence="verified",
            source="tls",
            evidence=result.certificateEvidence,
        ))

    return findings


async def analyze_ssl(hostname: str) -> AnalyzerResult:
    try:
        info = await asyncio.to_thread(_get_cert_info, hostname)
        result = _parse_cert(hostname, info)
    except ssl.SSLCertVerificationError as exc:
        # Connection succeeded but cert is untrusted — still return partial info
        result = SslResult(
            httpsAvailable=True,
            trusted=False,
            tlsConfidence="medium",
            certificateEvidence=[f"certificate verification failed: {exc}"],
            error=f"Certificate verification failed: {exc}",
        )
    except (ConnectionRefusedError, TimeoutError, OSError) as exc:
        result = SslResult(
            httpsAvailable=False,
            tlsConfidence="low",
            certificateEvidence=[f"tls connection failed: {exc}"],
            error=str(exc),
        )
    except Exception as exc:
        result = SslResult(
            httpsAvailable=False,
            tlsConfidence="low",
            certificateEvidence=[f"tls analyzer error: {exc}"],
            error=str(exc),
        )

    findings = _build_findings(result)
    return AnalyzerResult(key="ssl", status="success", data=result, findings=findings)
