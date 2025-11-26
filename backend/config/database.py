import pymysql
from contextlib import contextmanager
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 資料庫配置 - 從環境變數讀取
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', 4000)),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'ssl': {
        'ssl_mode': 'VERIFY_IDENTITY'
    }  # TiDB Cloud 需要 SSL 連線
}

@contextmanager
def get_db_connection():
    """取得資料庫連線的 context manager"""
    connection = None
    try:
        connection = pymysql.connect(**DB_CONFIG)
        yield connection
        connection.commit()
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"資料庫錯誤: {str(e)}")
        raise e
    finally:
        if connection:
            connection.close()

def init_db():
    """初始化資料庫連線測試"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.execute("SELECT DATABASE()")
                db_name = cursor.fetchone()
                print(f"✅ 資料庫連線成功: {db_name}")
                return True
    except Exception as e:
        print(f"❌ 資料庫連線失敗: {str(e)}")
        return False

def test_connection():
    """測試資料庫連線並顯示詳細資訊"""
    try:
        print("\n🔍 測試資料庫連線...")
        print(f"Host: {DB_CONFIG['host']}")
        print(f"Port: {DB_CONFIG['port']}")
        print(f"Database: {DB_CONFIG['database']}")
        print(f"User: {DB_CONFIG['user']}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 測試基本查詢
                cursor.execute("SELECT VERSION()")
                version = cursor.fetchone()
                print(f"✅ 資料庫版本: {version}")
                
                # 列出所有資料表
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"✅ 資料表數量: {len(tables)}")
                if tables:
                    print("📋 現有資料表:")
                    for table in tables:
                        print(f"  - {list(table.values())[0]}")
                
                return True
    except Exception as e:
        print(f"❌ 連線測試失敗: {str(e)}")
        return False