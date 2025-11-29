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
            


class DesignerService:
    """處理設計師的客製化服務設定"""

    @staticmethod
    def get_config(designer_id):
        """
        取得該設計師的所有服務設定。
        邏輯：列出所有 Service，若設計師有客製化設定則顯示，否則顯示 null 或預設值。
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        s.service_id, 
                        s.name, 
                        s.base_price, 
                        s.duration_min as default_duration,
                        dsi.price as custom_price,
                        dsi.duration_min as custom_duration,
                        dsi.is_enabled
                    FROM service s
                    LEFT JOIN designer_service_item dsi 
                        ON s.service_id = dsi.service_id AND dsi.designer_id = %s
                    WHERE s.is_active = 1
                """
                cursor.execute(sql, (designer_id,))
                results = cursor.fetchall()
                
                # 資料整理：前端需要直接拿到「最終顯示價格」
                data = []
                for row in results:
                    # 如果有客製化價格，就用客製化的，否則用基本價
                    final_price = row['custom_price'] if row['custom_price'] is not None else row['base_price']
                    # 如果有客製化時間，就用客製化的，否則用基本時間
                    final_duration = row['custom_duration'] if row['custom_duration'] is not None else row['default_duration']
                    # 如果尚未設定 is_enabled，預設為 0 (未啟用) 或 1 (啟用)，看你的商業邏輯
                    # 這裡假設：如果沒設定過，預設是不啟用 (需手動開啟)，或者你可以預設 True
                    is_enabled = row['is_enabled'] if row['is_enabled'] is not None else 0 

                    data.append({
                        'service_id': row['service_id'],
                        'name': row['name'],
                        'base_price': row['base_price'], # 參考用
                        'default_duration': row['default_duration'], # 參考用
                        'price': final_price,         # 當前設定價格
                        'duration_min': final_duration, # 當前設定時間
                        'is_enabled': bool(is_enabled), # 是否提供此服務
                        'is_customized': row['custom_price'] is not None # 標記是否為客製化
                    })
                return data
            
    @staticmethod
    def get_service_config(designer_id, service_id):
        """
        取得單一服務的最終設定 (給建立預約用)
        回傳: { 'final_price': ..., 'duration_min': ... }
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        -- 優先使用客製化價格/時間，沒有則使用預設值
                        COALESCE(dsi.price, s.base_price) as final_price,
                        COALESCE(dsi.duration_min, s.duration_min) as duration_min,
                        -- 檢查是否啟用
                        COALESCE(dsi.is_enabled, 1) as is_enabled
                    FROM service s
                    LEFT JOIN designer_service_item dsi 
                        ON s.service_id = dsi.service_id AND dsi.designer_id = %s
                    WHERE s.service_id = %s
                """
                cursor.execute(sql, (designer_id, service_id))
                return cursor.fetchone()

    @staticmethod
    def upsert_config(designer_id, service_configs):
        """
        更新或新增服務設定 (支援批次處理)
        service_configs = [{'service_id': 1, 'price': 1000, 'duration_min': 60, 'is_enabled': True}, ...]
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 使用 INSERT ON DUPLICATE KEY UPDATE 語法 (MySQL 特有，非常適合這種設定檔)
                sql = """
                    INSERT INTO designer_service_item 
                    (designer_id, service_id, price, duration_min, is_enabled)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        price = VALUES(price),
                        duration_min = VALUES(duration_min),
                        is_enabled = VALUES(is_enabled)
                """
                
                # 準備批次資料
                params = []
                for item in service_configs:
                    params.append((
                        designer_id,
                        item['service_id'],
                        item['price'],
                        item['duration_min'],
                        1 if item['is_enabled'] else 0
                    ))
                
                cursor.executemany(sql, params)
                conn.commit()
                return True
            
    @staticmethod
    def get_public_services(designer_id):
        """
        給顧客預約頁面用：取得該設計師「已上架」的服務與最終價格
        邏輯：如果有客製化價格用客製化，沒有則用基本價。
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        s.service_id, 
                        s.name, 
                        s.description,
                        -- 價格判斷：若 dsi.price 不為 NULL 則用 dsi.price，否則用 s.base_price
                        COALESCE(dsi.price, s.base_price) as final_price,
                        s.base_price as original_price, -- 保留原價做參考(可選)
                        -- 時間判斷：同理
                        COALESCE(dsi.duration_min, s.duration_min) as duration_min
                    FROM service s
                    LEFT JOIN designer_service_item dsi 
                        ON s.service_id = dsi.service_id AND dsi.designer_id = %s
                    WHERE s.is_active = 1 
                      -- 重要：只顯示設計師有開啟的服務，或是設計師根本沒設定過(視為預設開啟)
                      AND (dsi.is_enabled = 1 OR dsi.is_enabled IS NULL)
                """
                cursor.execute(sql, (designer_id,))
                return cursor.fetchall()