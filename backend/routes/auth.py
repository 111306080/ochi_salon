from flask import Blueprint, request, jsonify
from models.designer import Designer
from utils.auth import generate_token, token_required
from utils.validators import validate_email, validate_password
from models.customer import Customer

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """統一登入接口"""
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    # 前端需要多傳一個 role 參數來告訴後端是誰在登入 ('designer' 或 'customer')
    login_role = data.get('role', 'customer') 
    
    if not email or not password:
        return jsonify({'error': '請提供 email 和密碼'}), 400
    
    user = None
    user_id = None
    db_role = 'customer' # 預設角色
    
    # 依照登入角色查詢不同資料表
    if login_role == 'designer' or login_role == 'manager':
        user = Designer.get_by_email(email)
        if user:
            user_id = user['designer_id']
            db_role = user['role'] # 可能是 'designer' 或 'manager'
    else:
        # 顧客登入
        user = Customer.get_by_email(email)
        if user:
            user_id = user['customer_id']
            db_role = 'customer'
    
    # 驗證帳號密碼
    if not user or user['password_hash'] != password:
        return jsonify({'error': 'Email 或密碼錯誤'}), 401
        
    # 如果是設計師，檢查是否啟用
    if 'is_active' in user and not user['is_active']:
        return jsonify({'error': '此帳號已被停用'}), 403
    
    # 生成 token
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
    """修改密碼"""
    data = request.get_json()
    
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not new_password:
        return jsonify({'error': '請提供新密碼'}), 400
    
    if not validate_password(new_password):
        return jsonify({'error': '密碼至少需要 6 個字元'}), 400
    
    designer_id = request.user['user_id']
    designer = Designer.get_by_id(designer_id)
    
    # 驗證舊密碼
    if old_password and old_password != designer['password_hash']:
        return jsonify({'error': '舊密碼錯誤'}), 401
    
    # 更新密碼
    if Designer.update_password(designer_id, new_password):
        return jsonify({'message': '密碼更新成功'}), 200
    else:
        return jsonify({'error': '密碼更新失敗'}), 500

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """取得當前登入用戶資訊"""
    designer = Designer.get_by_id(request.user['user_id'])
    
    if not designer:
        return jsonify({'error': '找不到用戶'}), 404
    
    # 移除敏感資訊
    designer.pop('password_hash', None)
    
    return jsonify(designer), 200



@auth_bp.route('/register', methods=['POST'])
def register():
    """顧客註冊"""
    data = request.get_json()
    
    # 基本驗證
    if not all(k in data for k in ('name', 'email', 'password', 'phone')):
        return jsonify({'error': '請填寫所有欄位'}), 400
        
    customer_id, error = Customer.create(data)
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({'message': '註冊成功，請登入', 'customer_id': customer_id}), 201