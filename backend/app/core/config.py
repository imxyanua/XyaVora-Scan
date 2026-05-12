from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PORT: int = 8000
    ENV: str = "development"
    CORS_ORIGIN: str = "http://localhost:3000"

    SCAN_TIMEOUT_SECONDS: int = 30
    ANALYZER_TIMEOUT_SECONDS: int = 8
    FETCH_TIMEOUT_SECONDS: int = 8
    MAX_HTML_BYTES: int = 1_000_000
    ENABLE_SCREENSHOT: bool = False


settings = Settings()
