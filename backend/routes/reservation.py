from flask import Blueprint, request, jsonify
from models.reservation import Reservation
from models.service import Service
from utils.auth import token_required
from datetime import datetime, timedelta

reservation_bp = Blueprint('reservation', __name__, url_prefix='/api/reservations')

@reservation_bp.route('/services', methods=['GET'])
def get_services():
    """取得服務列表"""
    services = Service.get_all()
    return jsonify(services)

@reservation_bp.route('/availability', methods=['GET'])
def check_availability():
    """
    核心功能：查詢可用時段
    Query Params: designer_id, date (YYYY-MM-DD), service_id
    """
    designer_id = request.args.get('designer_id')
    date_str = request.args.get('date')
    service_id = request.args.get('service_id')

    if not all([designer_id, date_str, service_id]):
        return jsonify({'error': '缺少必要參數'}), 400

    # 1. 取得該服務需要多久時間
    service = Service.get_by_id(service_id)
    if not service:
        return jsonify({'error': '無此服務'}), 404
    
    duration_min = service['duration_min']

    # 2. 取得設計師當天已有的預約 (包含開始時間與時長)
    existing_reservations = Reservation.get_designer_daily_schedule(designer_id, date_str)

    # 3. 定義營業時間 (假設 11:00 - 20:00)
    # 未來這部分應該從 designer.schedule_info 或系統設定讀取
    shop_open_time = datetime.strptime(f"{date_str} 11:00", "%Y-%m-%d %H:%M")
    shop_close_time = datetime.strptime(f"{date_str} 20:00", "%Y-%m-%d %H:%M")

    # 4. 演算法：每 30 分鐘切一個 slot，檢查能不能塞進去
    available_slots = []
    current_slot = shop_open_time

    # 如果查詢的是今天，不能預約過去的時間
    now = datetime.now()
    if current_slot.date() == now.date() and current_slot < now:
        # 讓 current_slot 前進到下一個最近的半點或整點
        # 這裡簡單處理：直接從現在時間往後推一點
        current_slot = now + timedelta(minutes=30 - (now.minute % 30))
        current_slot = current_slot.replace(second=0, microsecond=0)

    while current_slot + timedelta(minutes=duration_min) <= shop_close_time:
        # 擬定這個 slot 的起訖時間
        slot_start = current_slot
        slot_end = current_slot + timedelta(minutes=duration_min)
        
        is_conflict = False
        
        # 檢查是否跟現有預約衝突
        for res in existing_reservations:
            # 資料庫拿出來的 reserved_time 應該是 datetime 物件
            res_start = res['reserved_time']
            res_end = res_start + timedelta(minutes=res['duration_min'])

            # 判斷重疊邏輯：(新開始 < 舊結束) AND (新結束 > 舊開始)
            if slot_start < res_end and slot_end > res_start:
                is_conflict = True
                break
        
        if not is_conflict:
            available_slots.append(slot_start.strftime("%H:%M"))

        # 下一個檢查點 (步長 30 分鐘)
        current_slot += timedelta(minutes=30)

    return jsonify({'slots': available_slots})

@reservation_bp.route('', methods=['POST'])
@token_required
def create_reservation():
    """建立預約"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # 必要的欄位檢查
    required = ['designer_id', 'service_id', 'date', 'time']
    if not all(k in data for k in required):
        return jsonify({'error': '資料不完整'}), 400

    # 取得服務價格作為 final_price
    service = Service.get_by_id(data['service_id'])
    if not service:
        return jsonify({'error': '服務不存在'}), 404

    # 組合 reserved_time (YYYY-MM-DD HH:MM)
    reserved_time_str = f"{data['date']} {data['time']}"
    
    # 準備寫入資料庫的資料
    reservation_data = {
        'customer_id': user_id,
        'designer_id': data['designer_id'],
        'service_id': data['service_id'],
        'reserved_time': reserved_time_str,
        'final_price': service['base_price'], # 初始價格等於基本價
        'notes': data.get('notes', '')
    }

    # 再次檢查後端防守 (防止並發預約造成的衝突)
    # 這裡簡化省略，實際專案建議加上 Transaction 或 Lock

    res_id, error = Reservation.create(reservation_data)
    if error:
        return jsonify({'error': str(error)}), 500

    return jsonify({'message': '預約請求已送出', 'reservation_id': res_id}), 201

@reservation_bp.route('/my', methods=['GET'])
@token_required
def get_my_reservations():
    """取得我的預約歷史"""
    user_id = request.user['user_id']
    reservations = Reservation.get_by_customer(user_id)
    return jsonify(reservations)

@reservation_bp.route('/designer/schedule', methods=['GET'])
@token_required
def get_designer_schedule():
    """
    設計師取得自己的預約列表 (管理後台用)
    支援篩選日期 ?date=2023-11-27
    """
    # 1. 權限檢查：確認是設計師或管理者
    current_user = request.user
    if current_user.get('role') not in ['designer', 'manager']:
        return jsonify({'error': '權限不足'}), 403

    designer_id = current_user.get('user_id') # 或是 'id'，需看你 Token payload 怎麼塞
    
    # 2. 接收日期篩選 (選填)
    target_date = request.args.get('date') # 格式 YYYY-MM-DD
    
    # 3. 呼叫 Model 查詢
    try:
        reservations = Reservation.get_for_designer_management(designer_id, target_date)
        return jsonify(reservations), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': '無法取得預約資料'}), 500
    
    
@reservation_bp.route('/<int:reservation_id>/status', methods=['PUT'])
@token_required
def update_reservation_status(reservation_id):
    """
    更新預約狀態 (設計師接單、完成、取消)
    Frontend: await reservationAPI.updateStatus(id, status)
    """
    data = request.get_json()
    new_status = data.get('status')
    
    # 允許的狀態列表，避免被亂改
    allowed_statuses = ['已確認', '已取消', '已完成']
    
    if not new_status or new_status not in allowed_statuses:
        return jsonify({'error': '無效的狀態'}), 400
    
    # 呼叫 Model 更新 (記得去 Model 補上這個方法)
    success = Reservation.update_status(reservation_id, new_status)
    
    if success:
        return jsonify({'message': f'預約狀態已更新為 {new_status}'}), 200
    else:
        return jsonify({'error': '更新失敗，找不到該預約或資料庫錯誤'}), 500