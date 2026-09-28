import smtplib
from email.message import EmailMessage
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def send_email(to_email: str, subject: str, content: str) -> bool:
    """
    Sends an email using configured SMTP settings.
    Since this is typically called via FastAPI BackgroundTasks, synchronous execution is safe.
    """
    if not settings.smtp_server:
        logger.warning(f"SMTP Server not configured. Mocking Email to {to_email} | Subject: {subject} | Content: {content}")
        return True

    msg = EmailMessage()
    msg.set_content(content)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            # Try to start TLS, but don't fail if the server doesn't support it or if it's already secured
            try:
                server.starttls()
            except Exception as e:
                logger.debug(f"STARTTLS not supported or failed: {e}")
                
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
                
            server.send_message(msg)
            
        logger.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error while sending email to {to_email}: {str(e)}")
        return False
