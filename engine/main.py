import uvicorn
from loguru import logger
from engine.config.settings import settings

def main():
    logger.info(f"Starting {settings.APP_NAME} on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "engine.api.server:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        access_log=True
    )

if __name__ == "__main__":
    main()
