from config.database import get_db_connection
from datetime import datetime, timedelta

class Reservation:
    
    @staticmethod
    def check_conflict(designer_id, start_time, duration_min, exclude_res_id=None):
        """
        核心邏輯：檢查時間是否衝突
        """
        # [修正] 容錯處理：同時支援含秒數與不含秒數的格式
        if isinstance(start_time, str):
            try:
                # 嘗試標準格式 (含秒)
                start_time = datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                try:
                    # 嘗試前端常見格式 (不含秒)
                    start_time = datetime.strptime(start_time, "%Y-%m-%d %H:%M")
                except ValueError:
                    # 如果格式真的太奇怪，這裡會報錯，但至少擋掉了上面的問題
                    raise ValueError(f"時間格式錯誤: {start_time}")
            
        end_time = start_time + timedelta(minutes=duration_min)
        
        date_str = start_time.strftime('%Y-%m-%d')
        daily_schedule = Reservation.get_designer_daily_schedule(designer_id, date_str)
        
        for res in daily_schedule:
            if exclude_res_id and str(res['reservation_id']) == str(exclude_res_id):
                continue

            exist_start = res['reserved_time'] 
            exist_duration = res['duration_min']
            exist_end = exist_start + timedelta(minutes=exist_duration)
            
            if start_time < exist_end and end_time > exist_start:
                return True 
                
        return False
    
    @staticmethod
    def create(data):
        """建立新預約 (包含衝突檢查)"""
        
        # 1. 先取得服務時長 (需要計算結束時間)
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT duration_min FROM service WHERE service_id = %s", (data['service_id'],))
                service = cursor.fetchone()
                if not service:
                    return None, "找不到此服務"
                duration = service['duration_min']

        # 2. 檢查是否有衝突 (Call 上面的邏輯)
        # 注意：這裡 data['reserved_time'] 可能是字串，check_conflict 會處理
        if Reservation.check_conflict(data['designer_id'], data['reserved_time'], duration):
            return None, "該時段已被預約，請選擇其他時間"

        # 3. 若無衝突，才執行寫入
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
                    data['reserved_time'], 
                    data['final_price'],
                    data.get('notes', '')
                ))
                conn.commit() # 記得 commit
                return cursor.lastrowid, None

    @staticmethod
    def get_designer_daily_schedule(designer_id, date_str):
        """
        取得設計師在特定日期的所有預約 (給排程計算用)
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
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

    @staticmethod
    def get_for_designer_management(designer_id, date=None):
        """
        [新增] 取得設計師的詳細預約列表 (包含顧客資訊，給後台看用)
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 使用 JOIN 取得顧客名稱(u.name)與服務名稱(s.name)
                # 假設你的使用者資料表叫 user 或 customer (請依實際調整)
                sql = """
                    SELECT 
                        r.reservation_id,
                        r.reserved_time,
                        r.status,
                        r.final_price,
                        r.notes,
                        s.name as service_name,
                        s.duration_min,
                        u.name as customer_name,
                        u.phone as customer_phone
                    FROM reservation r
                    JOIN service s ON r.service_id = s.service_id
                    JOIN customer u ON r.customer_id = u.customer_id
                    WHERE r.designer_id = %s
                """
                
                params = [designer_id]
                
                if date:
                    sql += " AND DATE(r.reserved_time) = %s"
                    params.append(date)
                
                sql += " ORDER BY r.reserved_time ASC"
                
                cursor.execute(sql, tuple(params))
                return cursor.fetchall()
            
    @staticmethod
    def update_status(reservation_id, new_status):
        """更新預約狀態"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = "UPDATE reservation SET status = %s WHERE reservation_id = %s"
                cursor.execute(sql, (new_status, reservation_id))
                conn.commit() # 重要：一定要 commit
                return cursor.rowcount > 0