import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from typing import Any, List, Optional, Dict
import logging
import config

logger = logging.getLogger("filetrack.database")


def get_connection(database: Optional[str] = None) -> pymysql.Connection:
    """
    Creates and returns a new MySQL database connection using credentials from config.py.
    """
    db_to_use = config.DB_NAME if database is None else database
    try:
        connection = pymysql.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=db_to_use,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=False,
            connect_timeout=5,
        )
        return connection
    except pymysql.MySQLError as e:
        logger.error(f"Failed to connect to MySQL database '{db_to_use}' on {config.DB_HOST}:{config.DB_PORT}: {e}")
        raise RuntimeError(
            f"Database connection error: Could not reach MySQL at {config.DB_HOST}:{config.DB_PORT}. "
            f"Please verify that your database service is running and credentials in config.py are correct. Detail: {e}"
        ) from e


@contextmanager
def get_db_cursor(commit: bool = False):
    """
    Context manager that yields a database cursor with automatic rollback on error.
    Ensures parameterized execution and proper resource cleanup.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield cursor
        if commit:
            conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database query error (rolled back): {e}")
        raise
    finally:
        conn.close()


def query_one(sql: str, params: Optional[Any] = None) -> Optional[Dict[str, Any]]:
    """
    Executes a parameterized SELECT query and returns a single row dictionary.
    """
    with get_db_cursor() as cursor:
        cursor.execute(sql, params or ())
        return cursor.fetchone()


def query_all(sql: str, params: Optional[Any] = None) -> List[Dict[str, Any]]:
    """
    Executes a parameterized SELECT query and returns a list of row dictionaries.
    """
    with get_db_cursor() as cursor:
        cursor.execute(sql, params or ())
        return cursor.fetchall()


def execute(sql: str, params: Optional[Any] = None) -> int:
    """
    Executes a parameterized INSERT/UPDATE/DELETE query and commits the transaction.
    Returns the last insert id (if applicable) or affected rows.
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, params or ())
        if cursor.lastrowid:
            return cursor.lastrowid
        return cursor.rowcount


def execute_batch(sql: str, param_list: List[Any]) -> int:
    """
    Executes a parameterized query across multiple parameter sets.
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.executemany(sql, param_list)
        return cursor.rowcount


def check_database_health() -> Dict[str, Any]:
    """
    Checks if MySQL is reachable and the required tables exist.
    """
    try:
        tables = query_all("SHOW TABLES;")
        table_names = [list(row.values())[0] for row in tables]
        required = ["users", "folders", "files"]
        missing = [r for r in required if r not in table_names]
        return {
            "connected": True,
            "database": config.DB_NAME,
            "tables": table_names,
            "ready": len(missing) == 0,
            "missing_tables": missing
        }
    except Exception as e:
        return {
            "connected": False,
            "database": config.DB_NAME,
            "error": str(e),
            "ready": False
        }
