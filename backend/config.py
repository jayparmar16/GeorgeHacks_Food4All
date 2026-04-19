from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/resilient_food"
    GEMINI_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = "+15005550006"  # Twilio test number
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_NETWORK: str = "devnet"
    OPENWEATHER_API_KEY: str = ""
    JWT_SECRET: str = "supersecretkey_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Cultural food defaults keyed by ISO3 country code
CULTURAL_DEFAULTS = {
    "hti": {
        "name": "Haiti",
        "staples": ["rice", "beans (pois)", "cornmeal (mayi moulen)", "plantains", "cassava (manyòk)", "cooking oil", "salt", "dried fish"],
        "ration_kg": {"rice": 3.0, "beans": 1.5, "cornmeal": 1.0, "cooking_oil": 0.5, "salt": 0.2, "dried_fish": 0.3},
        "currency": "HTG",
        "mobile_money": "MonCash",
        "languages": ["Haitian Creole", "French"],
        "hxl_group": "hti",
        "hdx_group": "hti",
    },
    "cod": {
        "name": "Democratic Republic of Congo",
        "staples": ["cassava flour (fufu)", "maize flour", "beans", "palm oil", "dried fish (makayabu)", "rice (urban)"],
        "ration_kg": {"cassava_flour": 3.0, "maize_flour": 1.0, "beans": 1.5, "palm_oil": 0.5, "dried_fish": 0.3},
        "currency": "CDF",
        "mobile_money": "MTN MoMo / Orange Money",
        "languages": ["French", "Lingala", "Swahili", "Kikongo", "Tshiluba"],
        "hxl_group": "cod",
        "hdx_group": "cod",
    },
    "moz": {
        "name": "Mozambique",
        "staples": ["maize meal (xima)", "beans", "cassava", "cooking oil"],
        "ration_kg": {"maize_meal": 3.0, "beans": 1.5, "cassava": 1.0, "cooking_oil": 0.5},
        "currency": "MZN",
        "mobile_money": "M-Pesa",
        "languages": ["Portuguese", "Emakhuwa", "Xichangana"],
        "hxl_group": "moz",
        "hdx_group": "moz",
    },
    "ind": {
        "name": "India",
        "staples": ["rice", "wheat flour (atta)", "dal (lentils)", "mustard/sunflower oil", "salt", "spices"],
        "ration_kg": {"rice": 2.0, "wheat_flour": 2.0, "dal": 1.0, "cooking_oil": 0.5, "salt": 0.2},
        "currency": "INR",
        "mobile_money": "UPI",
        "languages": ["Hindi", "English", "Bengali", "Telugu", "Tamil"],
        "hxl_group": "ind",
        "hdx_group": "ind",
    },
}
