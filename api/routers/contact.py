"""POST /api/contact — accepts a contact-form submission and emails it.

SMTP credentials come from environment variables. If SMTP_PASS is missing
the endpoint returns 503, so the form fails loudly rather than silently
dropping messages.
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger("contact")
router = APIRouter(prefix="/api", tags=["contact"])


class ContactForm(BaseModel):
    name: str
    email: str
    org: str = ""
    intent: str = ""
    message: str


@router.post("/contact")
def send_contact(form: ContactForm) -> dict[str, object]:
    smtp_host = os.getenv("SMTP_HOST", "smtp.hostinger.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "shri@arravindportfolio.tech")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_pass:
        raise HTTPException(status_code=503, detail="SMTP not configured")

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = smtp_user
    msg["Reply-To"] = form.email
    msg["Subject"] = f"Portfolio Contact: {form.intent or 'General'} — {form.name}"

    body = (
        "New contact form submission from arravindportfolio.tech\n\n"
        f"Name: {form.name}\n"
        f"Email: {form.email}\n"
        f"Organization: {form.org or '(not provided)'}\n"
        f"Intent: {form.intent or '(not selected)'}\n\n"
        "Message:\n"
        f"{form.message}\n\n"
        "---\n"
        "Sent via portfolio contact form\n"
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        log.info("Contact email sent from %s (%s)", form.name, form.email)
        return {"ok": True, "message": "Message sent successfully"}
    except Exception as exc:  # noqa: BLE001 — surface SMTP errors to the client
        log.error("SMTP error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Failed to send: {exc}",
        ) from exc
