import math
from config.database import get_db_connection

class Product:
    @staticmethod
    def create(data):
        """
        新增產品，並同時建立預設的 EOQ 參數
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # [cite_start]1. 插入產品資料 [cite: 70-79]
                    sql_product = """
                        INSERT INTO products 
                        (product_name, unit_cost, supplier_name, supplier_contact, 
                         lead_time, current_stock, description, image_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql_product, (
                        data['product_name'],
                        data['unit_cost'],
                        data.get('supplier_name'),
                        data.get('supplier_contact'),
                        data.get('lead_time', 0),
                        data.get('current_stock', 0),
                        data.get('description'),
                        data.get('image_url')
                    ))
                    
                    product_id = cursor.lastrowid

                    # [cite_start]2. 自動建立 EOQ 預設參數 (UX 優化) [cite: 85-87]
                    # 預設：訂購成本 100, 持有成本率 20%
                    sql_eoq = """
                        INSERT INTO eoq_parameters 
                        (product_id, ordering_cost, holding_cost_rate, annual_demand, safety_stock)
                        VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql_eoq, (
                        product_id,
                        100.00,  # 預設 S
                        20.00,   # 預設 H%
                        0,       # 初始年需求
                        0        # 初始安全存量
                    ))
                    
                    return product_id, None
        except Exception as e:
            print(f"Error in Product.create: {e}")
            return None, str(e)

    @staticmethod
    def get_all():
        """取得所有產品列表"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT p.*, e.eoq, e.rop 
                    FROM products p 
                    LEFT JOIN eoq_parameters e ON p.product_id = e.product_id
                    ORDER BY p.created_at DESC
                """
                cursor.execute(sql)
                return cursor.fetchall()
            
    @staticmethod
    def get_by_id(product_id):
        """取得單一產品詳細資料 (含 EOQ 參數)"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT p.*, 
                           e.annual_demand, e.ordering_cost, e.holding_cost_rate, e.safety_stock,
                           e.eoq, e.rop
                    FROM products p 
                    LEFT JOIN eoq_parameters e ON p.product_id = e.product_id
                    WHERE p.product_id = %s
                """
                cursor.execute(sql, (product_id,))
                return cursor.fetchone()

    @staticmethod
    def update_eoq_params(product_id, data):
        """
        更新參數並自動計算 EOQ 與 ROP
        核心公式參考規格書 
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # 1. 先取得產品成本與前置時間 (計算需要)
                    cursor.execute(
                        "SELECT unit_cost, lead_time FROM products WHERE product_id = %s", 
                        (product_id,)
                    )
                    product = cursor.fetchone()
                    if not product:
                        return None, "找不到該產品"

                    # 2. 準備計算參數 (轉成 float 避免 Decimal 計算問題)
                    unit_cost = float(product['unit_cost'])         # P
                    lead_time = int(product['lead_time'])           # LT
                    
                    D = float(data.get('annual_demand', 0))         # 年需求量 D
                    S = float(data.get('ordering_cost', 100))       # 每次訂購成本 S (預設100)
                    H_rate = float(data.get('holding_cost_rate', 20)) / 100.0 # 持有成本率 (轉小數)
                    safety_stock = int(data.get('safety_stock', 0)) # 安全存量
                    
                    # 3. 計算 EOQ (經濟訂購量)
                    # 公式: Q* = √(2DS/H) [cite: 11]
                    # H = 單位成本 * 年持有成本率 [cite: 17]
                    H = unit_cost * H_rate
                    
                    eoq_val = 0
                    if H > 0 and D > 0:
                        eoq_val = math.sqrt((2 * D * S) / H)
                        eoq_val = round(eoq_val) # 建議四捨五入至整數 [cite: 225]

                    # 4. 計算 ROP (再訂購點)
                    # 公式: ROP = d * LT + 安全存量 [cite: 42]
                    # d = 年需求量 / 365 [cite: 45]
                    daily_demand = D / 365
                    rop_val = (daily_demand * lead_time) + safety_stock
                    rop_val = math.ceil(rop_val) # 建議無條件進位 [cite: 226]

                    # 5. 更新資料庫
                    sql = """
                        UPDATE eoq_parameters 
                        SET annual_demand = %s, 
                            ordering_cost = %s, 
                            holding_cost_rate = %s, 
                            safety_stock = %s,
                            eoq = %s,
                            rop = %s
                        WHERE product_id = %s
                    """
                    cursor.execute(sql, (
                        D, S, data.get('holding_cost_rate', 20), safety_stock, 
                        eoq_val, rop_val, 
                        product_id
                    ))
                    
                    # 回傳計算結果供前端即時顯示
                    return {
                        'eoq': eoq_val,
                        'rop': rop_val,
                        'daily_demand': round(daily_demand, 2)
                    }, None

        except Exception as e:
            print(f"Error in update_eoq_params: {e}")
            return None, str(e)
        
    @staticmethod
    def add_transaction(data):
        """
        執行庫存異動（進貨/銷售）
        1. 檢查庫存是否足夠（若是銷售）
        2. 新增交易紀錄
        3. 更新產品庫存
        4. 回傳最新庫存與是否低於 ROP
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    product_id = data['product_id']
                    trans_type = data['transaction_type'] # 'IN' or 'OUT'
                    quantity = int(data['quantity'])
                    notes = data.get('notes', '')

                    # 1. 先查詢目前庫存與 ROP (為了檢查與回傳狀態)
                    sql_check = """
                        SELECT p.current_stock, p.product_name, e.rop 
                        FROM products p
                        LEFT JOIN eoq_parameters e ON p.product_id = e.product_id
                        WHERE p.product_id = %s
                    """
                    cursor.execute(sql_check, (product_id,))
                    product = cursor.fetchone()
                    
                    if not product:
                        return None, "找不到該產品"

                    current_stock = product['current_stock']
                    rop = product['rop'] if product['rop'] is not None else 0

                    # 2. 計算新庫存與驗證
                    if trans_type == 'OUT':
                        # 規格 7.1: 銷售數量不可大於目前庫存 [cite: 223]
                        if current_stock < quantity:
                            return None, f"庫存不足！目前僅剩 {current_stock}"
                        new_stock = current_stock - quantity
                        db_qty = -quantity # 寫入交易表的數值為負
                    
                    elif trans_type == 'IN':
                        new_stock = current_stock + quantity
                        db_qty = quantity  # 寫入交易表的數值為正
                        
                    elif trans_type == 'AUDIT': # 盤點 (預留擴充)
                        new_stock = quantity
                        db_qty = new_stock - current_stock # 差異值

                    else:
                        return None, "無效的交易類型"

                    # 3. 寫入交易紀錄表 (Transactions) [cite: 177]
                    sql_log = """
                        INSERT INTO transactions 
                        (product_id, transaction_type, quantity, stock_after, notes)
                        VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql_log, (
                        product_id, trans_type, db_qty, new_stock, notes
                    ))

                    # 4. 更新產品主表庫存 (Products) [cite: 119, 126]
                    sql_update = "UPDATE products SET current_stock = %s WHERE product_id = %s"
                    cursor.execute(sql_update, (new_stock, product_id))

                    # 5. 判斷是否需要訂購 (庫存 <= ROP) [cite: 127]
                    # 如果是銷售 (OUT) 且 新庫存 <= ROP，且 ROP > 0 (有設定過)
                    alert = False
                    if trans_type == 'OUT' and rop > 0 and new_stock <= rop:
                        alert = True

                    return {
                        'new_stock': new_stock,
                        'alert': alert,
                        'rop': rop,
                        'product_name': product['product_name']
                    }, None

        except Exception as e:
            print(f"Error in add_transaction: {e}")
            return None, str(e)

    @staticmethod
    def get_transactions(product_id):
        """取得單一產品的交易歷史紀錄"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                sql = """
                    SELECT * FROM transactions 
                    WHERE product_id = %s 
                    ORDER BY transaction_date DESC
                """
                cursor.execute(sql, (product_id,))
                return cursor.fetchall()