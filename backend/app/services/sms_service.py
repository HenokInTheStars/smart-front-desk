import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

AFROMESSAGE_API_URL = "https://api.afromessage.com/api/send"


async def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS via AfroMessage.
    Requires AFROMESSAGE_API_KEY to be set in environment.
    """
    if not settings.afromessage_api_key or settings.afromessage_api_key == "your-afromessage-bearer-token":
        logger.warning(f"AfroMessage API Key not configured. Mocking SMS to {phone_number}: {message}")
        return True

    payload = {
        "to": phone_number,
        "message": message,
    }
    
    if settings.afromessage_sender_name and settings.afromessage_sender_name != "your-sender-id":
        payload["sender"] = settings.afromessage_sender_name

    headers = {
        "Authorization": f"Bearer {settings.afromessage_api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                AFROMESSAGE_API_URL,
                json=payload,
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code in (200, 201):
                logger.info(f"Successfully sent SMS to {phone_number}")
                return True
            else:
                logger.error(f"Failed to send SMS to {phone_number}. Status: {response.status_code}, Response: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error while sending SMS to {phone_number}: {str(e)}")
        return False
