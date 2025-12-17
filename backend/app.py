from flask import Flask, jsonify
from flask_cors import CORS
from config.database import init_db, test_connection
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 匯入路由
from routes.auth import auth_bp
from routes.designer import designer_bp
from routes.portfolio import portfolio_bp
from routes.reservation import reservation_bp
from routes.manager import manager_bp
from routes.inventory import inventory_bp

app = Flask(__name__)
CORS(app)

# 配置
app.config['JSON_AS_ASCII'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# 註冊路由
app.register_blueprint(auth_bp)
app.register_blueprint(designer_bp)
app.register_blueprint(portfolio_bp)
app.register_blueprint(reservation_bp)
app.register_blueprint(manager_bp)
app.register_blueprint(inventory_bp)
# 測試路由
@app.route('/')
def home():
    return jsonify({
        'message': '歡迎使用奧創髮藝管理系統 API',
        'version': '1.0.0',
        'status': 'running',
        'environment': os.getenv('FLASK_ENV', 'production')
    })

@app.route('/health')
def health_check():
    db_status = init_db()
    return jsonify({
        'status': 'healthy' if db_status else 'unhealthy',
        'database': 'connected' if db_status else 'disconnected',
        'environment': os.getenv('FLASK_ENV', 'production')
    })

@app.route('/test-db')
def test_db():
    """測試資料庫連線的詳細資訊"""
    success = test_connection()
    return jsonify({
        'success': success,
        'message': '請查看終端機輸出以獲取詳細資訊'
    })

# 錯誤處理
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': '找不到此路由', 'status': 404}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '伺服器內部錯誤', 'status': 500}), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get("PORT", 5000)),
        debug=(os.getenv("FLASK_ENV") == "development")
    )
