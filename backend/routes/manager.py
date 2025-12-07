from flask import Blueprint, jsonify
from models.analysis import AnalysisService
from models.sales import SalesModel
from utils.auth import token_required, manager_required

manager_bp = Blueprint('manager', __name__, url_prefix='/api/manager')

@manager_bp.route('/analysis/rfm', methods=['GET'])
@token_required
@manager_required
def get_rfm_analysis():
    """取得 RFM 顧客分析數據"""
    raw_data = AnalysisService.get_rfm_data()
    
    analyzed_data = []
    
    # 用來計算儀表板總數
    summary = {
        'total_revenue': 0,
        'total_customers': len(raw_data),
        'active_customers': 0, # R <= 90
        'churn_risk': 0        # R > 180 & F >= 3
    }

    for row in raw_data:
        # 進行分群運算
        segment_info = AnalysisService.segment_customer(
            row['recency_days'], 
            row['frequency'], 
            row['monetary']
        )
        
        # 合併原始資料與分析結果
        customer_data = {**row, **segment_info}
        analyzed_data.append(customer_data)

        # 累加統計數據
        summary['total_revenue'] += row['monetary']
        if row['recency_days'] <= 90:
            summary['active_customers'] += 1
        if row['recency_days'] > 180 and row['frequency'] >= 3:
            summary['churn_risk'] += 1

    return jsonify({
        'summary': summary,
        'customers': analyzed_data
    })

@manager_bp.route('/analysis/sales', methods=['GET'])
@token_required
@manager_required
def get_sales_analysis():
    """取得銷售儀表板所需的所有數據"""
    
    kpi = SalesModel.get_monthly_kpi()
    avg_interval = SalesModel.get_purchase_interval()
    acquisition_rate = SalesModel.get_acquisition_rate()
    retention_rate = SalesModel.get_retention_rate()
    churn_rate = 100 - retention_rate
    trend = SalesModel.get_monthly_trend()
    
    return jsonify({
        'kpi': kpi,
        'metrics': {
            'avg_interval_days': avg_interval,
            'acquisition_rate': acquisition_rate,
            'retention_rate': retention_rate,
            'churn_rate': round(churn_rate, 2)
        },
        'trend': trend
    })