from config.database import get_db_connection

class Designer:
    @staticmethod
    def create(data):
        """創建設計師 (by 管理者)"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 檢查 email 是否已存在
                cursor.execute(
                    "SELECT designer_id FROM designer WHERE email = %s",
                    (data['email'],)
                )
                if cursor.fetchone():
                    return None, "Email 已被使用"
                
                # 插入設計師資料（密碼明文儲存）
                sql = """
                    INSERT INTO designer 
                    (name, phone, email, password_hash, role, is_active, style_description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                
                # 預設密碼為手機號碼後8碼
                default_password = data['phone'][-8:]
                
                cursor.execute(sql, (
                    data['name'],
                    data['phone'],
                    data['email'],
                    default_password,  # 明文儲存
                    data.get('role', 'designer'),
                    data.get('is_active', True),
                    data.get('style_description', '')
                ))
                
                designer_id = cursor.lastrowid
                return designer_id, None
    
    @staticmethod
    def get_by_email(email):
        """透過 email 取得設計師資料"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM designer WHERE email = %s",
                    (email,)
                )
                return cursor.fetchone()
    
    @staticmethod
    def get_by_id(designer_id):
        """透過 ID 取得設計師資料"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM designer WHERE designer_id = %s",
                    (designer_id,)
                )
                return cursor.fetchone()
    
    @staticmethod
    def update_password(designer_id, new_password):
        """更新密碼"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE designer SET password_hash = %s WHERE designer_id = %s",
                    (new_password, designer_id)
                )
                return cursor.rowcount > 0
    
    @staticmethod
    def update_photo(designer_id, photo_url):
        """更新設計師大頭貼"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE designer SET photo_url = %s WHERE designer_id = %s",
                    (photo_url, designer_id)
                )
                return cursor.rowcount > 0

    @staticmethod
    def update_profile(designer_id, data):
        """更新個人簡介與風格描述"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = "UPDATE designer SET name = %s, phone = %s, style_description = %s WHERE designer_id = %s"
                cursor.execute(sql, (data['name'], data['phone'], data['style_description'], designer_id))
                return cursor.rowcount > 0

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT designer_id, name, phone, email, style_description, 
                           rating_avg, photo_url, is_active, role, created_at
                    FROM designer
                    ORDER BY created_at DESC
                """)
                return cursor.fetchall()