import time
import pytest
from engine.core.ring_buffer import CircularRingBuffer

def test_ring_buffer_push_and_eviction():
    buffer = CircularRingBuffer(max_duration_seconds=2.0)
    
    # Push packets
    now = time.time()
    buffer.push("packet_1", timestamp=now - 3.0) # Older than 2s
    buffer.push("packet_2", is_keyframe=True, timestamp=now - 1.0)
    buffer.push("packet_3", timestamp=now - 0.5)
    buffer.push("packet_4", timestamp=now)

    window = buffer.get_window(pre_seconds=1.5)
    
    assert "packet_1" not in window
    assert "packet_2" in window
    assert "packet_3" in window
    assert "packet_4" in window

def test_ring_buffer_clear():
    buffer = CircularRingBuffer(max_duration_seconds=5.0)
    buffer.push("data_1")
    buffer.push("data_2")
    assert len(buffer.get_window(pre_seconds=5.0)) == 2

    buffer.clear()
    assert len(buffer.get_window(pre_seconds=5.0)) == 0
