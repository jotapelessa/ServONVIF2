import time
from collections import deque
from dataclasses import dataclass
from typing import List, Optional, Any
import threading

@dataclass
class BufferedPacket:
    packet: Any
    timestamp: float
    is_keyframe: bool

class CircularRingBuffer:
    """
    Thread-safe Circular Ring Buffer for storing compressed video packets (NAL units)
    or pre-decoded frames in RAM. Allows instant slicing of pre-event and post-event windows.
    """
    def __init__(self, max_duration_seconds: float = 10.0):
        self.max_duration = max_duration_seconds
        self._buffer: deque[BufferedPacket] = deque()
        self._lock = threading.Lock()

    def push(self, packet: Any, is_keyframe: bool = False, timestamp: Optional[float] = None) -> None:
        ts = timestamp if timestamp is not None else time.time()
        item = BufferedPacket(packet=packet, timestamp=ts, is_keyframe=is_keyframe)
        
        with self._lock:
            self._buffer.append(item)
            # Evict packets older than max_duration from current time
            min_ts = ts - self.max_duration
            while self._buffer and self._buffer[0].timestamp < min_ts:
                self._buffer.popleft()

    def get_window(self, pre_seconds: float = 3.0) -> List[Any]:
        """
        Retrieves packets from (now - pre_seconds) to present.
        Begins from the closest preceding keyframe to avoid corrupted video headers.
        """
        now = time.time()
        start_target = now - pre_seconds

        with self._lock:
            if not self._buffer:
                return []
            
            packets = list(self._buffer)

        # Find starting index: first packet within target window, aligned to keyframe if possible
        start_idx = 0
        first_keyframe_idx = None
        for i, item in enumerate(packets):
            if item.timestamp >= start_target:
                start_idx = i
                break
            if item.is_keyframe:
                first_keyframe_idx = i

        # Prefer aligning to the closest previous keyframe
        if first_keyframe_idx is not None and first_keyframe_idx < start_idx:
            start_idx = first_keyframe_idx

        return [item.packet for item in packets[start_idx:]]

    def clear(self) -> None:
        with self._lock:
            self._buffer.clear()
