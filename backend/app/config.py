from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://zhweb:zhweb_password@localhost:5432/zhweb"
    secret_key: str = "change-this-to-a-random-secret-key"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    allowed_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
