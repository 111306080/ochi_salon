from config.database import get_db_connection

class Reservation:
    @staticmethod
    def create(data):
        """建立新預約"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    INSERT INTO reservation 
                    (customer_id, designer_id, service_id, reserved_time, final_price, notes, status)
                    VALUES (%s, %s, %s, %s, %s, %s, '待確認')
                """
                cursor.execute(sql, (
                    data['customer_id'],
                    data['designer_id'],
                    data['service_id'],
                    data['reserved_time'], # 格式: 'YYYY-MM-DD HH:MM:SS'
                    data['final_price'],
                    data.get('notes', '')
                ))
                return cursor.lastrowid, None

    @staticmethod
    def get_designer_daily_schedule(designer_id, date_str):
        """
        取得設計師在特定日期的所有預約
        注意：因為資料表只有開始時間，我們需要 JOIN service 表來算出結束時間
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 這裡我們只撈出 "未取消" 的預約
                sql = """
                    SELECT r.reservation_id, r.reserved_time, s.duration_min
                    FROM reservation r
                    JOIN service s ON r.service_id = s.service_id
                    WHERE r.designer_id = %s 
                    AND DATE(r.reserved_time) = %s
                    AND r.status != '已取消'
                """
                cursor.execute(sql, (designer_id, date_str))
                return cursor.fetchall()

    @staticmethod
    def get_by_customer(customer_id):
        """取得顧客的預約紀錄"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT r.*, s.name as service_name, s.duration_min, d.name as designer_name, d.photo_url as designer_photo
                    FROM reservation r
                    JOIN service s ON r.service_id = s.service_id
                    JOIN designer d ON r.designer_id = d.designer_id
                    WHERE r.customer_id = %s
                    ORDER BY r.reserved_time DESC
                """
                cursor.execute(sql, (customer_id,))
                return cursor.fetchall()