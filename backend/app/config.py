from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="HUB_", env_file="/app/data/.env", extra="ignore")

    secret: str = ""
    invite_code: str = ""
    data_dir: str = "/app/data"
    db_path: str = ""
    jwt_exp_days: int = 30

    ai_api_key: str = ""
    ai_base_url: str = "https://openrouter.ai/api/v1"
    ai_model: str = "openrouter/auto"

    telegram_bot_token: str = ""


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.secret:
        s.secret = "dev-secret-change-me"
    if not s.db_path:
        s.db_path = f"{s.data_dir}/hub.db"
    return s


settings = get_settings()
