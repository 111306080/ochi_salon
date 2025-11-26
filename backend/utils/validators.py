import re

def validate_email(email):
    """驗證 email 格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    """驗證台灣手機號碼"""
    pattern = r'^09\d{8}$'
    return re.match(pattern, phone) is not None

def validate_password(password):
    """驗證密碼長度 (至少6字元)"""
    return len(password) >= 6