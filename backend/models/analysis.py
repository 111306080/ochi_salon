from config.database import get_db_connection

class AnalysisService:
    @staticmethod
    def get_rfm_data():
        """
        計算所有顧客的 RFM 原始數據
        R (Recency): 距離上次消費天數
        F (Frequency): 總消費次數 (只算已完成)
        M (Monetary): 總消費金額 (只算已完成)
        """
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT 
                        c.customer_id,
                        c.name,
                        c.phone,
                        c.email,
                        MAX(r.reserved_time) as last_purchase_date,
                        DATEDIFF(NOW(), MAX(r.reserved_time)) as recency_days,
                        COUNT(r.reservation_id) as frequency,
                        SUM(r.final_price) as monetary
                    FROM customer c
                    JOIN reservation r ON c.customer_id = r.customer_id
                    WHERE r.status = '已完成'  -- 只計算已完成的交易
                    GROUP BY c.customer_id
                    ORDER BY monetary DESC
                """
                cursor.execute(sql)
                return cursor.fetchall()

    @staticmethod
    def segment_customer(r, f, m):
        """
        [商業邏輯] RFM 分群規則
        這裡採用簡化的評分機制
        """
        # 給分 (1-5分)
        # Recency (越小越好)
        if r <= 60: r_score = 5    # 兩個月內有來
        elif r <= 120: r_score = 4 # 四個月內
        elif r <= 180: r_score = 3 # 半年內
        elif r <= 360: r_score = 2 # 一年內
        else: r_score = 1          # 超過一年沒來 (流失)

        # Frequency (越大越好)
        if f >= 10: f_score = 5
        elif f >= 6: f_score = 4
        elif f >= 3: f_score = 3
        elif f >= 2: f_score = 2
        else: f_score = 1

        # Monetary (越大越好)
        if m >= 20000: m_score = 5
        elif m >= 10000: m_score = 4
        elif m >= 5000: m_score = 3
        elif m >= 2000: m_score = 2
        else: m_score = 1

        segment = "一般顧客"
        color = "gray"

        if r_score >= 4 and f_score >= 4 and m_score >= 4:
            segment = "超級常客" # 高價值且活躍
            color = "purple"
        elif r_score >= 4 and f_score <= 2:
            segment = "潛力新客" # 剛來過，次數不多
            color = "green"
        elif r_score <= 2 and f_score >= 4:
            segment = "沈睡顧客" # 以前常來，最近沒來 (重點喚醒對象)
            color = "orange"
        elif r_score <= 2 and m_score >= 4:
            segment = "流失大戶" # 以前花很多錢，但很久沒來
            color = "red"
        elif f_score >= 4:
            segment = "忠誠熟客" # 常來，但可能單價普通
            color = "blue"
        elif r_score >= 3:
            segment = "活躍顧客" # 近期有來
            color = "teal"

        return {
            "r_score": r_score,
            "f_score": f_score,
            "m_score": m_score,
            "segment": segment,
            "color": color
        }