from flask import Blueprint, request, jsonify
from models.designer import Designer
from models.customer import Customer
from utils.auth import generate_token, token_required
from utils.validators import validate_email, validate_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """統一登入接口"""
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    # 前端傳來的角色: 'designer' (包含 manager) 或 'customer'
    login_role = data.get('role', 'customer') 
    
    if not email or not password:
        return jsonify({'error': '請提供 email 和密碼'}), 400
    
    user = None
    user_id = None
    db_role = 'customer'
    
    # 1. 依照角色查詢使用者
    if login_role in ['designer', 'manager']:
        user = Designer.get_by_email(email)
        if user:
            user_id = user['designer_id']
            db_role = user['role'] # 資料庫裡存的實際角色
    else:
        # 顧客登入
        user = Customer.get_by_email(email)
        if user:
            user_id = user['customer_id']
            db_role = 'customer'
    
    # 2. 驗證帳號是否存在
    if not user:
         return jsonify({'error': 'Email 或密碼錯誤'}), 401

    # 3. 驗證密碼 (建議使用 Model 封裝的方法，即使是明文比對)
    # 這樣未來如果改加密，Controller 這裡完全不用動
    is_valid = False
    if login_role in ['designer', 'manager']:
        is_valid = Designer.check_password(user['password_hash'], password)
        # 額外檢查設計師是否停用
        if is_valid and not user.get('is_active', True):
            return jsonify({'error': '此帳號已被停用'}), 403
    else:
        # 假設 Customer model 也有 check_password，若無則直接比對
        if hasattr(Customer, 'check_password'):
            is_valid = Customer.check_password(user['password_hash'], password)
        else:
            is_valid = user['password_hash'] == password

    if not is_valid:
        return jsonify({'error': 'Email 或密碼錯誤'}), 401
    
    # 4. 生成 token
    # 注意：generate_token 內部必須將 user_id 放入 payload，並命名為 'user_id'
    token = generate_token(
        user_id,
        db_role,
        email
    )
    
    return jsonify({
        'message': '登入成功',
        'token': token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'role': db_role
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """修改密碼 (通用)"""
    data = request.get_json()
    new_password = data.get('new_password')
    old_password = data.get('old_password') # 建議加上舊密碼驗證
    
    if not new_password:
        return jsonify({'error': '請提供新密碼'}), 400
    
    # [修正] 從 token 判斷是誰
    user_id = request.user['user_id']
    role = request.user.get('role')

    success = False
    
    if role in ['designer', 'manager']:
        # 這裡可以先檢查舊密碼 (略)
        success = Designer.update_password(user_id, new_password)
    else:
        # 顧客修改密碼
        # 需確保 Customer Model 有 update_password 方法
        success = Customer.update_password(user_id, new_password)
    
    if success:
        return jsonify({'message': '密碼更新成功'}), 200
    else:
        return jsonify({'error': '密碼更新失敗，找不到用戶或資料庫錯誤'}), 500

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """取得當前登入用戶資訊 (通用)"""
    
    # [修正] 從 token 取得 user_id 和 role
    user_id = request.user['user_id']
    role = request.user.get('role')
    
    user = None
    
    # 依照角色去查不同的表
    if role in ['designer', 'manager']:
        user = Designer.get_by_id(user_id)
    else:
        user = Customer.get_by_id(user_id)
    
    if not user:
        return jsonify({'error': '找不到用戶'}), 404
    
    # 移除敏感資訊
    user.pop('password_hash', None)
    
    # 確保回傳 role，前端可能需要用
    if 'role' not in user:
        user['role'] = role
    
    return jsonify(user), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """顧客註冊"""
    data = request.get_json()
    
    # 基本驗證
    required_fields = ['name', 'email', 'password', 'phone']
    if not all(k in data for k in required_fields):
        return jsonify({'error': '請填寫所有欄位'}), 400
        
    customer_id, error = Customer.create(data)
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({'message': '註冊成功，請登入', 'customer_id': customer_id}), 201