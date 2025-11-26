import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# JWT 密鑰從環境變數讀取
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

def generate_token(user_id, role, email):
    """
    生成 JWT token（登入後發給用戶的通行證）
    就像是遊樂園的手環，證明你已經買票進場了
    """
    payload = {
        'user_id': user_id,
        'role': role,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)  # 7天後過期
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def decode_token(token):
    """
    解碼 JWT token（驗證通行證是否有效）
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None  # token 過期了
    except jwt.InvalidTokenError:
        return None  # token 無效

def token_required(f):
    """
    裝飾器：保護需要登入才能使用的 API
    
    使用方式：
    @app.route('/protected')
    @token_required
    def protected_route():
        return "只有登入的人才能看到這個"
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # 從 Header 取得 token
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': '請先登入'}), 401
        
        try:
            # 移除 'Bearer ' 前綴（前端通常會加這個）
            if token.startswith('Bearer '):
                token = token[7:]
            
            # 驗證 token
            payload = decode_token(token)
            if not payload:
                return jsonify({'error': 'token 無效或已過期'}), 401
            
            # 把用戶資訊存到 request 物件，方便後續使用
            request.user = payload
        except Exception as e:
            return jsonify({'error': '認證失敗'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def manager_required(f):
    """
    裝飾器：只有管理者才能使用的 API
    
    使用方式：
    @app.route('/admin-only')
    @manager_required
    def admin_route():
        return "只有管理者才能看到這個"
    """
    @wraps(f)
    @token_required  # 先檢查有沒有登入
    def decorated(*args, **kwargs):
        # 再檢查是不是管理者
        if request.user.get('role') != 'manager':
            return jsonify({'error': '需要管理者權限'}), 403
        return f(*args, **kwargs)
    return decorated