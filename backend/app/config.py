from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./medai.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"
    cors_origins: str = "http://localhost:5173"
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    upload_dir: str = "./uploads"
    seed_admin_password: str = "Admin123!"
    # When True, patient name/DOB/phone/email/IDs are masked before sending to AI
    deidentify_prompts: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
