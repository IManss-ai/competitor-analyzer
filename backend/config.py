from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./tdcr.db"
    clerk_jwks_url: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_basic: str = ""
    stripe_price_unlimited: str = ""
    base_url: str = "http://localhost:8000"
    company_page_base_url: str = "http://localhost:8000/p"

    class Config:
        env_file = ".env"

settings = Settings()
