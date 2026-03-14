import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Optional
from pydantic import BaseModel, Field

class SendEmailInput(BaseModel):
    to: str = Field(description="The recipient's email address.")
    subject: str = Field(description="The subject of the email.")
    body: str = Field(description="The plain text content of the email.")

def send_email(to: str, subject: str, body: str, api_keys: Optional[Dict[str, str]] = None) -> str:
    """
    Send an email to a recipient with a subject and body using SMTP.
    """
    smtp_password = (api_keys or {}).get('SMTP_PASSWORD') or os.getenv('SMTP_PASSWORD')
    
    if not smtp_password:
        return "Error: SMTP_PASSWORD not configured. Please provide it in agent settings."
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    sender_email = (api_keys or {}).get('SENDER_EMAIL') or os.getenv('SENDER_EMAIL') or "noreply@personaforge.com"

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, smtp_password)
        server.send_message(msg)
        server.quit()
        
        return f"Email sent successfully to {to}"
    except Exception as e:
        return f"Error sending email: {str(e)}"
