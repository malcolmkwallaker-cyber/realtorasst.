import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EmailFinder:
    """
    Public email discovery using pattern inference.
    Only infers from patterns already visible on the company's public website.
    No external API calls or SMTP verification in MVP.
    """

    PATTERNS = [
        ("{first}.{last}@{domain}", 0.85),
        ("{first}@{domain}", 0.70),
        ("{first}{last}@{domain}", 0.65),
        ("{f}{last}@{domain}", 0.60),
        ("{first}.{l}@{domain}", 0.55),
        ("info@{domain}", 0.30),
        ("contact@{domain}", 0.30),
    ]

    def find_emails_in_html(self, html: str) -> list[str]:
        """Regex extraction of all email addresses from raw HTML."""
        emails = re.findall(
            r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}",
            html
        )
        return list({
            e.lower() for e in emails
            if not any(skip in e.lower() for skip in [
                ".png", ".jpg", ".gif", "example.com", "sentry.io",
                "w3.org", "schema.org", "domain.com"
            ])
        })

    def detect_domain_pattern(self, known_emails: list[str]) -> Optional[str]:
        """
        Given a list of emails from the same domain, detect the naming convention.
        Returns a pattern template string or None.
        """
        if not known_emails:
            return None

        for email in known_emails:
            local, domain = email.split("@")
            parts = re.split(r"[._\-]", local)

            if len(parts) == 2:
                if len(parts[0]) > 2 and len(parts[1]) > 2:
                    return "{first}.{last}@{domain}"
                if len(parts[0]) == 1:
                    return "{f}{last}@{domain}"
            elif len(parts) == 1:
                if len(local) > 4:
                    return "{first}@{domain}"

        return None

    def infer_email(
        self,
        full_name: str,
        domain: str,
        known_emails: list[str]
    ) -> tuple[Optional[str], float]:
        """
        Infer the likely email for a person based on known patterns from the same domain.
        Returns (email, confidence) or (None, 0.0).
        """
        if not full_name or not domain:
            return None, 0.0

        name_parts = full_name.lower().strip().split()
        if not name_parts:
            return None, 0.0

        first = name_parts[0]
        last = name_parts[-1] if len(name_parts) > 1 else ""
        f = first[0] if first else ""
        l = last[0] if last else ""

        # Try to detect pattern from known emails on this domain
        same_domain = [e for e in known_emails if e.endswith(f"@{domain}")]
        detected_pattern = self.detect_domain_pattern(same_domain)

        if detected_pattern:
            try:
                email = detected_pattern.format(
                    first=first, last=last, f=f, l=l, domain=domain
                )
                return email, 0.75
            except KeyError:
                pass

        # Fall back to most common pattern
        if first and last:
            return f"{first}.{last}@{domain}", 0.50

        return None, 0.0
