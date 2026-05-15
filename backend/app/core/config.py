from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PORT: int = 8000
    ENV: str = "development"
    CORS_ORIGIN: str = "http://localhost:3000"

    SCAN_TIMEOUT_SECONDS: int = 90
    ANALYZER_TIMEOUT_SECONDS: int = 8
    SCREENSHOT_TIMEOUT_SECONDS: int = 45
    FETCH_TIMEOUT_SECONDS: int = 8
    MAX_HTML_BYTES: int = 1_000_000
    ENABLE_SCREENSHOT: bool = True


settings = Settings()
