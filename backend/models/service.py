from config.database import get_db_connection

class Service:
    @staticmethod
    def get_all():
        """取得所有上架的服務"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT service_id, name, category, base_price, duration_min, description 
                    FROM service 
                    WHERE is_active = TRUE
                """)
                return cursor.fetchall()

    @staticmethod
    def get_by_id(service_id):
        """取得單一服務詳情"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM service WHERE service_id = %s", (service_id,))
                return cursor.fetchone()