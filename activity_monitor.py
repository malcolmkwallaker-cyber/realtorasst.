import sqlite3
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil

DB_PATH = Path(__file__).parent / "activity.db"
SESSION_GAP_SECONDS = 300  # 5-minute gap = new session
POLL_INTERVAL = 5           # seconds between window checks

_monitor_thread: threading.Thread | None = None
_stop_event = threading.Event()
_monitor_lock = threading.Lock()
_xdotool_available: bool | None = None  # None = not yet probed


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def init_db() -> None:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS activities (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp    TEXT NOT NULL,
            app_name     TEXT NOT NULL,
            window_title TEXT NOT NULL,
            duration_sec INTEGER NOT NULL,
            source       TEXT NOT NULL DEFAULT 'desktop',
            session_id   INTEGER
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            ended_at   TEXT NOT NULL,
            label      TEXT,
            sop_text   TEXT
        )
    """)
    con.commit()
    con.close()


# ---------------------------------------------------------------------------
# xdotool helpers
# ---------------------------------------------------------------------------

def _check_xdotool() -> bool:
    global _xdotool_available
    if _xdotool_available is not None:
        return _xdotool_available
    try:
        subprocess.run(
            ["xdotool", "version"],
            capture_output=True, timeout=2, check=True
        )
        _xdotool_available = True
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        _xdotool_available = False
    return _xdotool_available


def _get_active_window_info() -> tuple[str, str] | None:
    """Returns (app_name, window_title) or None if unavailable."""
    try:
        win_id = subprocess.check_output(
            ["xdotool", "getactivewindow"],
            stderr=subprocess.DEVNULL, timeout=2
        ).decode().strip()

        title = subprocess.check_output(
            ["xdotool", "getwindowname", win_id],
            stderr=subprocess.DEVNULL, timeout=2
        ).decode().strip()

        pid_str = subprocess.check_output(
            ["xdotool", "getwindowpid", win_id],
            stderr=subprocess.DEVNULL, timeout=2
        ).decode().strip()

        try:
            app_name = psutil.Process(int(pid_str)).name()
        except (psutil.NoSuchProcess, ValueError):
            app_name = _extract_app_from_title(title)

        return app_name, title

    except FileNotFoundError:
        return None
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None


def _extract_app_from_title(title: str) -> str:
    parts = title.rsplit(" - ", 1)
    return parts[-1].strip() if len(parts) > 1 else "Unknown"


# ---------------------------------------------------------------------------
# Background monitor thread
# ---------------------------------------------------------------------------

def _insert_activity(
    timestamp: str, app_name: str, window_title: str,
    duration_sec: int, source: str = "desktop"
) -> None:
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO activities (timestamp, app_name, window_title, duration_sec, source) "
        "VALUES (?, ?, ?, ?, ?)",
        (timestamp, app_name, window_title, duration_sec, source)
    )
    con.commit()
    con.close()


def _monitor_loop() -> None:
    current_app: str | None = None
    current_title: str | None = None
    window_start: datetime | None = None

    while not _stop_event.is_set():
        info = _get_active_window_info()
        now = datetime.now(timezone.utc)

        if info is None:
            _stop_event.wait(POLL_INTERVAL)
            continue

        app_name, window_title = info

        if current_title is None:
            current_app = app_name
            current_title = window_title
            window_start = now
        elif window_title != current_title:
            duration = int((now - window_start).total_seconds())
            if duration >= 1:
                _insert_activity(window_start.isoformat(), current_app, current_title, duration)
            current_app = app_name
            current_title = window_title
            window_start = now

        _stop_event.wait(POLL_INTERVAL)

    # Flush last window on stop
    if current_title and window_start:
        now = datetime.now(timezone.utc)
        duration = int((now - window_start).total_seconds())
        if duration >= 1:
            _insert_activity(window_start.isoformat(), current_app, current_title, duration)


# ---------------------------------------------------------------------------
# Public control API
# ---------------------------------------------------------------------------

def start_monitor() -> dict:
    global _monitor_thread
    if not _check_xdotool():
        return {"status": "not_running_xdotool"}
    with _monitor_lock:
        if _monitor_thread is not None and _monitor_thread.is_alive():
            return {"status": "already_running"}
        _stop_event.clear()
        _monitor_thread = threading.Thread(
            target=_monitor_loop, daemon=True, name="activity-monitor"
        )
        _monitor_thread.start()
        return {"status": "started"}


def stop_monitor() -> dict:
    global _monitor_thread
    with _monitor_lock:
        if _monitor_thread is None or not _monitor_thread.is_alive():
            return {"status": "not_running"}
        _stop_event.set()
        _monitor_thread.join(timeout=12)
        _monitor_thread = None
        return {"status": "stopped"}


def get_monitor_status() -> dict:
    with _monitor_lock:
        running = _monitor_thread is not None and _monitor_thread.is_alive()
    con = sqlite3.connect(DB_PATH)
    row = con.execute(
        "SELECT COUNT(*) FROM activities WHERE session_id IS NULL"
    ).fetchone()
    con.close()
    return {"running": running, "unassigned_activity_count": row[0]}


# ---------------------------------------------------------------------------
# Phone activity intake
# ---------------------------------------------------------------------------

def log_phone_activity(
    app_name: str, window_title: str, duration_sec: int, source: str
) -> None:
    _insert_activity(
        datetime.now(timezone.utc).isoformat(),
        app_name, window_title, duration_sec, source
    )


# ---------------------------------------------------------------------------
# Session grouping
# ---------------------------------------------------------------------------

def _auto_label_session(con: sqlite3.Connection, activity_ids: list[int]) -> str:
    ph = ",".join("?" * len(activity_ids))
    top = con.execute(
        f"SELECT app_name, SUM(duration_sec) total FROM activities "
        f"WHERE id IN ({ph}) GROUP BY app_name ORDER BY total DESC LIMIT 1",
        activity_ids
    ).fetchone()
    top_app = top[0] if top else "Unknown"

    total_dur = con.execute(
        f"SELECT SUM(duration_sec) FROM activities WHERE id IN ({ph})",
        activity_ids
    ).fetchone()[0] or 0

    app_count = con.execute(
        f"SELECT COUNT(DISTINCT app_name) FROM activities WHERE id IN ({ph})",
        activity_ids
    ).fetchone()[0]

    total_min = max(1, total_dur // 60)
    return f"{top_app} — {app_count} app(s), {total_min} min"


def finalize_sessions() -> int:
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT id, timestamp FROM activities "
        "WHERE session_id IS NULL ORDER BY timestamp ASC"
    ).fetchall()

    if not rows:
        con.close()
        return 0

    sessions_created = 0
    current_ids: list[int] = []
    prev_ts: datetime | None = None
    session_start: str | None = None
    session_end: str | None = None

    def _flush(ids, start, end):
        nonlocal sessions_created
        label = _auto_label_session(con, ids)
        cur = con.execute(
            "INSERT INTO sessions (started_at, ended_at, label) VALUES (?, ?, ?)",
            (start, end, label)
        )
        sid = cur.lastrowid
        con.executemany(
            "UPDATE activities SET session_id=? WHERE id=?",
            [(sid, aid) for aid in ids]
        )
        sessions_created += 1

    for row_id, ts_str in rows:
        ts = datetime.fromisoformat(ts_str)
        if prev_ts is None:
            current_ids = [row_id]
            session_start = ts_str
            session_end = ts_str
        elif (ts - prev_ts).total_seconds() > SESSION_GAP_SECONDS:
            _flush(current_ids, session_start, session_end)
            current_ids = [row_id]
            session_start = ts_str
            session_end = ts_str
        else:
            current_ids.append(row_id)
            session_end = ts_str
        prev_ts = ts

    if current_ids:
        _flush(current_ids, session_start, session_end)

    con.commit()
    con.close()
    return sessions_created


# ---------------------------------------------------------------------------
# Session / activity queries
# ---------------------------------------------------------------------------

def list_sessions() -> list[dict]:
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT id, started_at, ended_at, label, (sop_text IS NOT NULL) "
        "FROM sessions ORDER BY started_at DESC"
    ).fetchall()
    con.close()
    return [
        {
            "id": r[0], "started_at": r[1], "ended_at": r[2],
            "label": r[3], "has_sop": bool(r[4])
        }
        for r in rows
    ]


def get_session_activities(session_id: int) -> list[dict]:
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT timestamp, app_name, window_title, duration_sec, source "
        "FROM activities WHERE session_id=? ORDER BY timestamp ASC",
        (session_id,)
    ).fetchall()
    con.close()
    return [
        {
            "timestamp": r[0], "app_name": r[1],
            "window_title": r[2], "duration_sec": r[3], "source": r[4]
        }
        for r in rows
    ]


def save_sop(session_id: int, sop_text: str) -> None:
    con = sqlite3.connect(DB_PATH)
    con.execute("UPDATE sessions SET sop_text=? WHERE id=?", (sop_text, session_id))
    con.commit()
    con.close()


def get_sop(session_id: int) -> str | None:
    con = sqlite3.connect(DB_PATH)
    row = con.execute("SELECT sop_text FROM sessions WHERE id=?", (session_id,)).fetchone()
    con.close()
    return row[0] if row else None


# ---------------------------------------------------------------------------
# Terminal / CLI mode
# ---------------------------------------------------------------------------

def _cli_run() -> None:
    """
    Run the monitor in the terminal. Prints each window change as it happens.
    Press Ctrl+C to stop. Activities are saved to activity.db as normal.
    """
    if not _check_xdotool():
        print("Error: xdotool is not installed.")
        print("Install it with:  sudo apt install xdotool")
        return

    init_db()
    print("Activity Monitor running — press Ctrl+C to stop.\n")
    print(f"{'TIME':<8} {'APP':<22} WINDOW TITLE")
    print("-" * 72)

    current_title: str | None = None
    current_app: str | None = None
    window_start: datetime | None = None

    try:
        while True:
            info = _get_active_window_info()
            now = datetime.now(timezone.utc)

            if info is not None:
                app_name, window_title = info

                if current_title is None:
                    current_app = app_name
                    current_title = window_title
                    window_start = now
                elif window_title != current_title:
                    duration = int((now - window_start).total_seconds())
                    if duration >= 1:
                        _insert_activity(
                            window_start.isoformat(), current_app,
                            current_title, duration
                        )
                        local_time = window_start.astimezone().strftime("%H:%M:%S")
                        mins = duration // 60
                        secs = duration % 60
                        dur_str = f"({mins}m {secs}s)" if mins else f"({secs}s)"
                        title_preview = current_title[:45] + "…" \
                            if len(current_title) > 45 else current_title
                        print(
                            f"{local_time:<8} {current_app[:20]:<22} "
                            f"{title_preview}  {dur_str}"
                        )
                    current_app = app_name
                    current_title = window_title
                    window_start = now

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        # Flush last window
        if current_title and window_start:
            now = datetime.now(timezone.utc)
            duration = int((now - window_start).total_seconds())
            if duration >= 1:
                _insert_activity(
                    window_start.isoformat(), current_app,
                    current_title, duration
                )
        n = finalize_sessions()
        print(f"\nStopped. {n} session(s) saved to {DB_PATH}")
        print("Open the web app and go to SOP Generator to turn sessions into SOPs.")


if __name__ == "__main__":
    _cli_run()
