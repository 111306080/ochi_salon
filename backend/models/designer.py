from config.database import get_db_connection

class Designer:
    @staticmethod
    def create(data):
        """創建設計師"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 檢查 email
                cursor.execute("SELECT designer_id FROM designer WHERE email = %s", (data['email'],))
                if cursor.fetchone():
                    return None, "Email 已被使用"
                
                # 預設密碼 (MVP: 明文儲存)
                default_password = data['phone'][-8:]
                
                sql = """
                    INSERT INTO designer 
                    (name, phone, email, password_hash, role, is_active, style_description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    data['name'],
                    data['phone'],
                    data['email'],
                    default_password,  # 直接存明文
                    data.get('role', 'designer'),
                    data.get('is_active', True),
                    data.get('style_description', '')
                ))
                
                conn.commit() 
                return cursor.lastrowid, None
    
    # [修正] 補上缺少的驗證密碼函式
    @staticmethod
    def check_password(stored_password_hash, password):
        return str(stored_password_hash) == str(password)

    @staticmethod
    def get_by_email(email):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM designer WHERE email = %s", (email,))
                return cursor.fetchone()
    
    @staticmethod
    def get_by_id(designer_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM designer WHERE designer_id = %s", (designer_id,))
                return cursor.fetchone()
    
    @staticmethod
    def update_password(designer_id, new_password):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE designer SET password_hash = %s WHERE designer_id = %s",
                    (new_password, designer_id)
                )
                conn.commit()
                return cursor.rowcount > 0

    @staticmethod
    def update_photo(designer_id, photo_url):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE designer SET photo_url = %s WHERE designer_id = %s",
                    (photo_url, designer_id)
                )
                conn.commit()
                return cursor.rowcount > 0

    @staticmethod
    def update_profile(designer_id, data):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = "UPDATE designer SET name = %s, phone = %s, style_description = %s WHERE designer_id = %s"
                cursor.execute(sql, (data['name'], data['phone'], data['style_description'], designer_id))
                conn.commit()
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