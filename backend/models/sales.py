from config.database import get_db_connection
from datetime import datetime

class SalesModel:
    
    @staticmethod
    def _to_dict_list(cursor, rows):
        if not rows: return []
        
        # 1. 判斷：如果第一筆資料已經是 dict，代表 Driver 已經轉好了，直接回傳
        if isinstance(rows[0], dict):
            return rows
            
        # 2. 如果是 tuple，才手動進行轉換
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def _to_dict(cursor, row):
        if not row: return None
        
        # 判斷：如果是 dict 直接回傳
        if isinstance(row, dict):
            return row
            
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))

    @staticmethod
    def get_monthly_kpi():
        """取得本月核心 KPI 與 MoM"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql_revenue = """
                    SELECT 
                        DATE_FORMAT(reserved_time, '%Y-%m') as month,
                        SUM(final_price) as total_revenue,
                        COUNT(DISTINCT customer_id) as active_customers
                    FROM reservation
                    WHERE status = '已完成' 
                      AND reserved_time >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
                    GROUP BY month
                    ORDER BY month DESC
                """
                cursor.execute(sql_revenue)
                rows = cursor.fetchall()
                
                data = SalesModel._to_dict_list(cursor, rows)
                
                current = data[0] if len(data) > 0 else {'total_revenue': 0, 'active_customers': 0}
                last = data[1] if len(data) > 1 else {'total_revenue': 0, 'active_customers': 0}
                
                current_rev = float(current.get('total_revenue') or 0)
                last_rev = float(last.get('total_revenue') or 0)

                growth_rate = 0
                if last_rev > 0:
                    growth_rate = ((current_rev - last_rev) / last_rev) * 100

                return {
                    'current_revenue': int(current_rev),
                    'last_revenue': int(last_rev),
                    'growth_rate': round(growth_rate, 2),
                    'active_customers': current.get('active_customers', 0)
                }

    @staticmethod
    def get_purchase_interval():
        """計算平均購買間隔"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    WITH Intervals AS (
                        SELECT 
                            customer_id,
                            reserved_time,
                            LAG(reserved_time) OVER (PARTITION BY customer_id ORDER BY reserved_time) as prev_time
                        FROM reservation
                        WHERE status = '已完成'
                    )
                    SELECT AVG(DATEDIFF(reserved_time, prev_time)) as avg_days
                    FROM Intervals
                    WHERE prev_time IS NOT NULL;
                """
                cursor.execute(sql)
                result = SalesModel._to_dict(cursor, cursor.fetchone())
                
                avg_days = result.get('avg_days') if result else 0
                return round(float(avg_days), 1) if avg_days else 0

    @staticmethod
    def get_acquisition_rate():
        """計算本月顧客獲取率"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT COUNT(*) as new_paying_customers
                    FROM (
                        SELECT customer_id, MIN(reserved_time) as first_buy
                        FROM reservation
                        WHERE status = '已完成'
                        GROUP BY customer_id
                    ) as first_buys
                    WHERE DATE_FORMAT(first_buy, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                """
                cursor.execute(sql)
                new_paying_res = SalesModel._to_dict(cursor, cursor.fetchone())
                new_paying = new_paying_res.get('new_paying_customers', 0) if new_paying_res else 0
                
                cursor.execute("""
                    SELECT COUNT(DISTINCT customer_id) as total 
                    FROM reservation 
                    WHERE status='已完成' AND DATE_FORMAT(reserved_time, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                """)
                total_res = SalesModel._to_dict(cursor, cursor.fetchone())
                total_active = total_res.get('total', 0) if total_res else 0
                
                if total_active == 0: return 0
                return round((new_paying / total_active) * 100, 2)

    @staticmethod
    def get_retention_rate():
        """計算留存率"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql_last_month = """
                    SELECT DISTINCT customer_id FROM reservation 
                    WHERE status='已完成' 
                    AND reserved_time BETWEEN DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01') 
                                      AND LAST_DAY(NOW() - INTERVAL 1 MONTH)
                """
                cursor.execute(sql_last_month)
                
                raw_rows = cursor.fetchall()
                if not raw_rows:
                    return 0
                
                if isinstance(raw_rows[0], dict):
                    last_month_ids = [row['customer_id'] for row in raw_rows]
                else:
                    last_month_ids = [row[0] for row in raw_rows]

                format_ids = ','.join(map(str, last_month_ids))
                sql_this_month = f"""
                    SELECT COUNT(DISTINCT customer_id) as retained
                    FROM reservation
                    WHERE status='已完成'
                    AND reserved_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
                    AND customer_id IN ({format_ids})
                """
                cursor.execute(sql_this_month)
                retained_res = SalesModel._to_dict(cursor, cursor.fetchone())
                retained_count = retained_res.get('retained', 0) if retained_res else 0
                
                return round((retained_count / len(last_month_ids)) * 100, 2)

    @staticmethod
    def get_monthly_trend():
        """取得趨勢圖表資料"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        DATE_FORMAT(reserved_time, '%Y-%m') as month,
                        SUM(final_price) as revenue,
                        COUNT(reservation_id) as order_count
                    FROM reservation
                    WHERE status = '已完成' 
                      AND reserved_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    GROUP BY month
                    ORDER BY month ASC
                """
                cursor.execute(sql)
                rows = cursor.fetchall()
                
                data = SalesModel._to_dict_list(cursor, rows)
                for item in data:
                    item['revenue'] = int(item.get('revenue') or 0)
                
                return data