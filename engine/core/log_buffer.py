from collections import deque
from datetime import datetime
from typing import List, Dict, Any
from loguru import logger
import sys

class LogBuffer:
    def __init__(self, max_records: int = 500):
        self.max_records = max_records
        self.records: deque = deque(maxlen=max_records)

    def write(self, message):
        record = message.record
        log_entry = {
            "timestamp": record["time"].strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "level": record["level"].name,
            "message": record["message"],
            "module": record["name"],
            "function": record["function"],
            "line": record["line"],
        }
        self.records.append(log_entry)

    def get_logs(self, limit: int = 200, level_filter: str = None) -> List[Dict[str, Any]]:
        logs = list(self.records)
        if level_filter and level_filter != "ALL":
            logs = [l for l in logs if l["level"] == level_filter]
        return logs[-limit:]

log_buffer = LogBuffer(max_records=1000)

# Register log_buffer sink with loguru
logger.add(log_buffer.write, level="DEBUG")
