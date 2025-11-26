from config.database import get_db_connection

class Customer:
    @staticmethod
    def create(data):
        """註冊新客戶"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 檢查 email
                cursor.execute("SELECT customer_id FROM customer WHERE email = %s", (data['email'],))
                if cursor.fetchone():
                    return None, "此 Email 已被註冊"
                
                # 插入資料 (暫時使用明文密碼，請記得未來要改 Hash)
                sql = """
                    INSERT INTO customer (name, phone, email, password_hash)
                    VALUES (%s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    data['name'], 
                    data['phone'], 
                    data['email'], 
                    data['password']
                ))
                return cursor.lastrowid, None

    @staticmethod
    def get_by_email(email):
        """透過 email 取得客戶"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM customer WHERE email = %s", (email,))
                return cursor.fetchone()

    @staticmethod
    def get_by_id(customer_id):
        """透過 ID 取得客戶"""
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM customer WHERE customer_id = %s", (customer_id,))
                return cursor.fetchone()