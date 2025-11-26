from config.database import get_db_connection

class Portfolio:
    @staticmethod
    def create(designer_id, image_url, image_public_id, description=None, style_tag=None):
        """新增作品"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    INSERT INTO portfolio 
                    (designer_id, image_url, image_public_id, description, style_tag)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (designer_id, image_url, image_public_id, description, style_tag))
                return cursor.lastrowid
    
    @staticmethod
    def get_by_designer(designer_id):
        """取得設計師的所有作品"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT portfolio_id, designer_id, image_url, image_public_id,
                           description, style_tag, created_at
                    FROM portfolio 
                    WHERE designer_id = %s 
                    ORDER BY created_at DESC
                """, (designer_id,))
                return cursor.fetchall()
    
    @staticmethod
    def get_by_id(portfolio_id):
        """取得單一作品"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM portfolio WHERE portfolio_id = %s",
                    (portfolio_id,)
                )
                return cursor.fetchone()
    
    @staticmethod
    def delete(portfolio_id):
        """刪除作品"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM portfolio WHERE portfolio_id = %s",
                    (portfolio_id,)
                )
                return cursor.rowcount > 0
    
    @staticmethod
    def update(portfolio_id, description=None, style_tag=None):
        """更新作品描述和標籤"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                updates = []
                params = []
                
                if description is not None:
                    updates.append("description = %s")
                    params.append(description)
                
                if style_tag is not None:
                    updates.append("style_tag = %s")
                    params.append(style_tag)
                
                if not updates:
                    return False
                
                params.append(portfolio_id)
                sql = f"UPDATE portfolio SET {', '.join(updates)} WHERE portfolio_id = %s"
                
                cursor.execute(sql, params)
                return cursor.rowcount > 0
    
    @staticmethod
    def get_all(limit=50, offset=0):
        """取得所有作品（分頁）"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.portfolio_id, p.designer_id, p.image_url, 
                           p.description, p.style_tag, p.created_at,
                           d.name as designer_name
                    FROM portfolio p
                    LEFT JOIN designer d ON p.designer_id = d.designer_id
                    ORDER BY p.created_at DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                return cursor.fetchall()
    
    @staticmethod
    def count():
        """取得作品總數"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as total FROM portfolio")
                result = cursor.fetchone()
                return result['total'] if result else 0
    
    @staticmethod
    def search_by_tag(style_tag):
        """根據風格標籤搜尋作品"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.portfolio_id, p.designer_id, p.image_url, 
                           p.description, p.style_tag, p.created_at,
                           d.name as designer_name
                    FROM portfolio p
                    LEFT JOIN designer d ON p.designer_id = d.designer_id
                    WHERE p.style_tag LIKE %s
                    ORDER BY p.created_at DESC
                """, (f'%{style_tag}%',))
                return cursor.fetchall()