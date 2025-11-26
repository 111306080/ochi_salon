"""
測試資料庫連線並建立初始管理者帳號
執行: python test_db.py
"""
from config.database import test_connection, get_db_connection

def create_admin():
    """建立管理者帳號"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                print("\n📝 檢查管理者帳號...")
                
                # 檢查是否已有管理者
                cursor.execute("SELECT COUNT(*) as count FROM designer WHERE role='manager'")
                result = cursor.fetchone()
                
                if result['count'] == 0:
                    print("⏳ 建立管理者帳號...")
                    cursor.execute("""
                        INSERT INTO designer (name, phone, email, password_hash, role, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, ('系統管理員', '0900000000', 'admin@salon.com', 'admin123', 'manager', True))
                    
                    print("✅ 管理者帳號建立成功")
                    print("=" * 60)
                    print("📧 Email: admin@salon.com")
                    print("🔑 密碼: admin123")
                    print("=" * 60)
                else:
                    print("ℹ️  管理者帳號已存在")
                
        return True
    except Exception as e:
        print(f"❌ 建立管理者失敗: {str(e)}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🧪 資料庫連線測試工具")
    print("=" * 60)
    
    if test_connection():
        print("\n" + "=" * 60)
        create_admin()
        print("=" * 60)
        print("\n✅ 測試完成！現在可以執行 'python app.py' 啟動服務")
    else:
        print("\n❌ 請檢查資料庫設定")