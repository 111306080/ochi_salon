from flask import Blueprint, request, jsonify
from models.inventory import Product
from utils.cloudinary_helper import upload_image

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/api/inventory/products', methods=['POST'])
def create_product():
    """
    新增產品 (支援圖片上傳)
    接收格式: multipart/form-data
    """
    try:
        # 1. 處理圖片上傳
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                # 使用你現有的 upload_image 函式，存到 salon/products 資料夾
                upload_result = upload_image(file, folder='salon/products')
                if upload_result:
                    image_url = upload_result['url']
                else:
                    return jsonify({'error': '圖片上傳失敗'}), 500

        # 2. 接收文字欄位 (因為是 multipart，要用 request.form)
        data = request.form
        
        # 必填驗證
        if not data.get('product_name'):
            return jsonify({'error': '產品名稱為必填'}), 400
        if not data.get('unit_cost'):
            return jsonify({'error': '單位成本為必填'}), 400

        # 3. 準備寫入資料庫的資料
        product_data = {
            'product_name': data.get('product_name'),
            'unit_cost': float(data.get('unit_cost')),
            'supplier_name': data.get('supplier_name'),
            'supplier_contact': data.get('supplier_contact'),
            'lead_time': int(data.get('lead_time', 0)),
            'current_stock': int(data.get('current_stock', 0)),
            'description': data.get('description'),
            'image_url': image_url  # 這裡存入 Cloudinary 回傳的 URL
        }

        # 4. 呼叫 Model 建立產品 (這部分維持原本邏輯)
        product_id, error = Product.create(product_data)

        if error:
            return jsonify({'error': error}), 500

        return jsonify({
            'message': '產品新增成功',
            'product_id': product_id,
            'image_url': image_url
        }), 201

    except Exception as e:
        print(f"Error creating product: {e}")
        return jsonify({'error': '系統錯誤，請稍後再試'}), 500

@inventory_bp.route('/api/inventory/products', methods=['GET'])
def get_products():
    """取得產品列表"""
    try:
        products = Product.get_all()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@inventory_bp.route('/api/inventory/products/<int:product_id>/eoq', methods=['PUT'])
def update_product_eoq(product_id):
    """
    更新 EOQ 參數並觸發自動計算
    """
    data = request.get_json()
    
    # 驗證必填數值
    try:
        if float(data.get('annual_demand', 0)) < 0:
             return jsonify({'error': '年需求量必須大於等於 0'}), 400
    except ValueError:
        return jsonify({'error': '數值格式錯誤'}), 400

    # 呼叫 Model 執行計算與更新
    result, error = Product.update_eoq_params(product_id, data)
    
    if error:
        if error == "找不到該產品":
            return jsonify({'error': error}), 404
        return jsonify({'error': error}), 500

    return jsonify({
        'message': 'EOQ 參數更新成功，計算完成',
        'data': result  # 回傳計算好的 EOQ, ROP
    }), 200

# 順便補上取得單一產品的 API (方便前端編輯時回顯資料)
@inventory_bp.route('/api/inventory/products/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    product = Product.get_by_id(product_id)
    if not product:
        return jsonify({'error': '找不到該產品'}), 404
    return jsonify(product), 200

@inventory_bp.route('/api/inventory/transactions', methods=['POST'])
def add_transaction():
    """
    執行庫存異動 (進貨/銷售)
    """
    data = request.get_json()

    # 驗證必填資料
    if not data.get('product_id'):
        return jsonify({'error': '產品 ID 為必填'}), 400
    if not data.get('transaction_type') in ['IN', 'OUT', 'AUDIT']:
        return jsonify({'error': '交易類型錯誤 (IN/OUT)'}), 400
    
    try:
        qty = int(data.get('quantity', 0))
        if qty <= 0:
            return jsonify({'error': '數量必須大於 0'}), 400
    except ValueError:
        return jsonify({'error': '數量格式錯誤'}), 400

    # 執行交易
    result, error = Product.add_transaction(data)

    if error:
        return jsonify({'error': error}), 400

    # 建構回傳訊息
    response = {
        'message': '交易成功',
        'current_stock': result['new_stock']
    }

    # 規格 3.5: 觸發訂購提醒 [cite: 146]
    if result['alert']:
        response['warning'] = f"注意：庫存 ({result['new_stock']}) 已低於再訂購點 ({result['rop']})，請盡快補貨！"

    return jsonify(response), 201

@inventory_bp.route('/api/inventory/products/<int:product_id>/transactions', methods=['GET'])
def get_product_transactions(product_id):
    """取得產品交易紀錄"""
    try:
        transactions = Product.get_transactions(product_id)
        return jsonify(transactions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500