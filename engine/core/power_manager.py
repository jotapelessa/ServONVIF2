import sys
import os
import subprocess
from typing import Optional
from loguru import logger

class PowerManager:
    """
    Cross-platform 24/7 Power & Sleep Management for ServONVIF NVR Engine:
    - macOS: Prevents System & Network Sleep (via caffeinate & IOKit IOPMAssertion) while allowing Display to turn off.
    - Windows: Prevents System Sleep & enables AwayMode (via SetThreadExecutionState).
    - Linux: Supports continuous daemon operation.
    """
    def __init__(self):
        self._caffeinate_proc: Optional[subprocess.Popen] = None
        self._assertion_id: Optional[int] = None

    def start(self) -> None:
        if sys.platform == "darwin":
            self._start_macos()
        elif sys.platform == "win32":
            self._start_windows()
        else:
            logger.info("🛡️ Linux Power Management: Standard 24/7 server mode active.")

    def stop(self) -> None:
        if sys.platform == "darwin":
            self._stop_macos()
        elif sys.platform == "win32":
            self._stop_windows()

    def _start_macos(self) -> None:
        try:
            # 1. Spawn system caffeinate process tied to current PID
            # -s: prevent system sleep
            # -i: prevent idle sleep
            # -m: prevent disk sleep
            # -w: automatically terminate when current python PID terminates
            current_pid = str(os.getpid())
            self._caffeinate_proc = subprocess.Popen(
                ["caffeinate", "-s", "-i", "-m", "-w", current_pid],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            logger.info(f"🛡️ macOS Power Management: Caffeinate active [PID {self._caffeinate_proc.pid}]. System will NOT sleep when screen turns off!")
        except Exception as e:
            logger.warning(f"Could not spawn caffeinate process on macOS: {e}")

        # 2. Native IOKit Assertion fallback
        try:
            import ctypes
            iokit = ctypes.CDLL("/System/Library/Frameworks/IOKit.framework/IOKit")
            core_foundation = ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")

            core_foundation.CFStringCreateWithCString.restype = ctypes.c_void_p
            core_foundation.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
            kCFStringEncodingUTF8 = 0x08000100

            reason = core_foundation.CFStringCreateWithCString(None, b"ServONVIF 24/7 NVR Background Ingestion", kCFStringEncodingUTF8)
            assertion_type = core_foundation.CFStringCreateWithCString(None, b"NoIdleSleepAssertion", kCFStringEncodingUTF8)

            assertion_id = ctypes.c_uint32(0)
            res = iokit.IOPMAssertionCreateWithName(assertion_type, 255, reason, ctypes.byref(assertion_id))
            if res == 0:
                self._assertion_id = assertion_id.value
                logger.info(f"🛡️ macOS Native IOKit Power Assertion registered (ID: {self._assertion_id})")
        except Exception as e:
            logger.debug(f"Native IOKit assertion attempt note: {e}")

    def _stop_macos(self) -> None:
        if self._caffeinate_proc:
            try:
                self._caffeinate_proc.terminate()
            except Exception:
                pass
            self._caffeinate_proc = None

        if self._assertion_id:
            try:
                import ctypes
                iokit = ctypes.CDLL("/System/Library/Frameworks/IOKit.framework/IOKit")
                iokit.IOPMAssertionRelease(ctypes.c_uint32(self._assertion_id))
                logger.info("macOS IOKit Power Assertion released cleanly.")
            except Exception:
                pass
            self._assertion_id = None

    def _start_windows(self) -> None:
        try:
            import ctypes
            # ES_CONTINUOUS = 0x80000000
            # ES_SYSTEM_REQUIRED = 0x00000001
            # ES_AWAYMODE_REQUIRED = 0x00000040
            ES_CONTINUOUS = 0x80000000
            ES_SYSTEM_REQUIRED = 0x00000001
            ES_AWAYMODE_REQUIRED = 0x00000040

            ctypes.windll.kernel32.SetThreadExecutionState(
                ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED
            )
            logger.info("🛡️ Windows Power Management: SetThreadExecutionState active (Away Mode / No Sleep).")
        except Exception as e:
            logger.warning(f"Could not configure Windows execution state: {e}")

    def _stop_windows(self) -> None:
        try:
            import ctypes
            ES_CONTINUOUS = 0x80000000
            ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
        except Exception:
            pass

power_manager = PowerManager()
