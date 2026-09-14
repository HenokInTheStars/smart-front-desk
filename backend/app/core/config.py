import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Typed application config. Field names map to the .env variables
    case-insensitively by default (e.g. `database_url` <- DATABASE_URL),
    so these must line up with backend/.env.example.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    openai_api_key: str | None = None
    jwt_secret: str
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    frontend_origin: str = "http://localhost:3000"
    
    afromessage_api_key: str | None = None
    afromessage_sender_name: str | None = None

    @property
    def resolved_database_url(self) -> str:
        url = self.database_url
        if "@postgres:" in url and not os.path.exists("/.dockerenv"):
            return url.replace("@postgres:5432", "@localhost:5433").replace("@postgres:", "@localhost:5433")
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
