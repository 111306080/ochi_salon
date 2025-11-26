from flask import Blueprint, request, jsonify
from models.portfolio import Portfolio
from models.designer import Designer
from utils.auth import token_required
from utils.cloudinary_helper import upload_image, delete_image

portfolio_bp = Blueprint('portfolio', __name__, url_prefix='/api/portfolio')

@portfolio_bp.route('/upload', methods=['POST'])
@token_required
def upload_portfolio():
    """上傳作品 (需登入)"""
    
    # 檢查是否有檔案
    if 'image' not in request.files:
        return jsonify({'error': '請選擇圖片'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': '未選擇檔案'}), 400
    
    # 取得其他欄位
    description = request.form.get('description', '')
    style_tag = request.form.get('style_tag', '')
    
    designer_id = request.user['user_id']
    
    # 上傳到 Cloudinary
    upload_result = upload_image(file, folder='salon/portfolio')
    
    if not upload_result:
        return jsonify({'error': '圖片上傳失敗'}), 500
    
    # 儲存到資料庫
    portfolio_id = Portfolio.create(
        designer_id=designer_id,
        image_url=upload_result['url'],
        image_public_id=upload_result['public_id'],
        description=description,
        style_tag=style_tag
    )
    
    return jsonify({
        'message': '作品上傳成功',
        'portfolio_id': portfolio_id,
        'image_url': upload_result['url']
    }), 201

@portfolio_bp.route('/designer/<int:designer_id>', methods=['GET'])
def get_designer_portfolio(designer_id):
    """取得設計師的作品集 (公開)"""
    
    # 檢查設計師是否存在
    designer = Designer.get_by_id(designer_id)
    if not designer:
        return jsonify({'error': '找不到此設計師'}), 404
    
    portfolios = Portfolio.get_by_designer(designer_id)
    
    return jsonify({
        'designer_id': designer_id,
        'designer_name': designer['name'],
        'portfolios': portfolios,
        'total': len(portfolios)
    }), 200

@portfolio_bp.route('/my', methods=['GET'])
@token_required
def get_my_portfolio():
    """取得自己的作品集"""
    designer_id = request.user['user_id']
    portfolios = Portfolio.get_by_designer(designer_id)
    
    return jsonify({
        'portfolios': portfolios,
        'total': len(portfolios)
    }), 200

@portfolio_bp.route('/<int:portfolio_id>', methods=['DELETE'])
@token_required
def delete_portfolio(portfolio_id):
    """刪除作品"""
    
    # 檢查作品是否存在
    portfolio = Portfolio.get_by_id(portfolio_id)
    if not portfolio:
        return jsonify({'error': '找不到此作品'}), 404
    
    # 檢查權限（只能刪除自己的作品或管理者可以刪除）
    if portfolio['designer_id'] != request.user['user_id'] and request.user['role'] != 'manager':
        return jsonify({'error': '沒有權限刪除此作品'}), 403
    
    if portfolio.get('image_public_id'):
        delete_image(portfolio['image_public_id'])
    
    # 從資料庫刪除
    if Portfolio.delete(portfolio_id):
        return jsonify({'message': '作品刪除成功'}), 200
    else:
        return jsonify({'error': '刪除失敗'}), 500

@portfolio_bp.route('/<int:portfolio_id>', methods=['PUT'])
@token_required
def update_portfolio(portfolio_id):
    """更新作品描述"""
    
    data = request.get_json()
    
    # 檢查作品是否存在
    portfolio = Portfolio.get_by_id(portfolio_id)
    if not portfolio:
        return jsonify({'error': '找不到此作品'}), 404
    
    # 檢查權限
    if portfolio['designer_id'] != request.user['user_id']:
        return jsonify({'error': '沒有權限修改此作品'}), 403
    
    # 更新
    if Portfolio.update(
        portfolio_id,
        description=data.get('description'),
        style_tag=data.get('style_tag')
    ):
        return jsonify({'message': '作品更新成功'}), 200
    else:
        return jsonify({'error': '更新失敗'}), 500