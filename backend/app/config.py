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


@lru_cache
def get_settings() -> Settings:
    # lru_cache means Settings() is only constructed once per process,
    # not re-read from disk on every request.
    return Settings()
