from flask import Blueprint, request, jsonify
from models.designer import Designer, DesignerService
from utils.auth import manager_required, token_required
from utils.validators import validate_email, validate_phone
from utils.cloudinary_helper import upload_image 

designer_bp = Blueprint('designer', __name__, url_prefix='/api/designers')

# 1. 創建設計師 (管理者用)
@designer_bp.route('', methods=['POST'])
@manager_required
def create_designer():
    """創建設計師 (僅管理者)"""
    data = request.get_json()
    
    # 驗證必填欄位
    required_fields = ['name', 'phone', 'email']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'缺少必填欄位: {field}'}), 400
    
    # 驗證 email 格式
    if not validate_email(data['email']):
        return jsonify({'error': 'Email 格式不正確'}), 400
    
    # 驗證手機格式
    if not validate_phone(data['phone']):
        return jsonify({'error': '手機號碼格式不正確'}), 400
    
    # 創建設計師
    designer_id, error = Designer.create(data)
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({
        'message': '設計師創建成功',
        'designer_id': designer_id,
        'default_password': data['phone'][-8:]  # 回傳預設密碼
    }), 201

# 2. 取得所有設計師列表 (公開)
@designer_bp.route('', methods=['GET'])
def get_all_designers():
    """取得所有設計師列表"""
    designers = Designer.get_all()
    
    # 移除敏感資訊
    for designer in designers:
        designer.pop('password_hash', None)
    
    return jsonify({
        'designers': designers,
        'total': len(designers)
    }), 200

# 3. 取得單一設計師資料 (公開)
@designer_bp.route('/<int:designer_id>', methods=['GET'])
def get_designer(designer_id):
    """取得單一設計師資料"""
    designer = Designer.get_by_id(designer_id)
    
    if not designer:
        return jsonify({'error': '找不到此設計師'}), 404
    
    # 移除敏感資訊
    designer.pop('password_hash', None)
    
    return jsonify(designer), 200

# 4. 上傳大頭貼 (設計師本人用)
@designer_bp.route('/me/avatar', methods=['POST'])
@token_required
def upload_avatar():
    """設計師上傳個人大頭貼"""
    if 'image' not in request.files:
        return jsonify({'error': '請選擇圖片'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': '未選擇檔案'}), 400

    # 上傳到 Cloudinary (存到 salon/avatars 資料夾)
    upload_result = upload_image(file, folder='salon/avatars')
    if not upload_result:
        return jsonify({'error': '圖片上傳失敗'}), 500

    # 更新資料庫
    user_id = request.user['user_id']
    if Designer.update_photo(user_id, upload_result['url']):
        return jsonify({
            'message': '大頭貼更新成功',
            'photo_url': upload_result['url']
        }), 200
    else:
        return jsonify({'error': '資料庫更新失敗'}), 500

# 5. 更新個人資料 (設計師本人用)
@designer_bp.route('/me', methods=['PUT'])
@token_required
def update_my_profile():
    """設計師更新個人資料"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    if Designer.update_profile(user_id, data):
        return jsonify({'message': '資料更新成功'}), 200
    return jsonify({'error': '更新失敗'}), 500

# 6. 取得我的服務設定列表
@designer_bp.route('/me/services', methods=['GET'])
@token_required
def get_my_services():
    """取得設計師自己的服務與價格設定"""
    user_id = request.user['user_id']
    
    services = DesignerService.get_config(user_id)
    return jsonify({'services': services}), 200

# 7. 更新我的服務設定 (批次更新)
@designer_bp.route('/me/services', methods=['PUT'])
@token_required
def update_my_services():
    """
    更新服務設定
    前端傳送格式: 
    {
        "services": [
            {"service_id": 1, "price": 1200, "duration_min": 70, "is_enabled": true},
            ...
        ]
    }
    """
    user_id = request.user['user_id']
    data = request.get_json()
    
    if not data or 'services' not in data:
        return jsonify({'error': '資料格式錯誤'}), 400
        
    service_configs = data['services']
    
    # 基本驗證
    for item in service_configs:
        if 'service_id' not in item or 'price' not in item or 'duration_min' not in item:
            return jsonify({'error': '缺少必要參數'}), 400

    try:
        DesignerService.upsert_config(user_id, service_configs)
        return jsonify({'message': '服務設定已更新'}), 200
    except Exception as e:
        print(f"Update service error: {e}")
        return jsonify({'error': '更新失敗'}), 500
    