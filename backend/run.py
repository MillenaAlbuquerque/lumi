import asyncio
import sys

# psycopg's async mode is incompatible with Windows' default ProactorEventLoop.
# This must be set before uvicorn creates its event loop, so it lives in this
# entrypoint script rather than inside app.main.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
