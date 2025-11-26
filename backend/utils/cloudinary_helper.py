import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

# 配置 Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

def upload_image(file, folder='salon'):
    """
    上傳圖片到 Cloudinary
    
    Args:
        file: 檔案物件 (從 request.files 取得)
        folder: Cloudinary 資料夾名稱
    
    Returns:
        dict: 包含 url 和 public_id 的字典
        None: 上傳失敗
    """
    try:
        # 上傳圖片
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type='auto'  # 自動偵測檔案類型
        )
        
        return {
            'url': result['secure_url'],
            'public_id': result['public_id']
        }
    except Exception as e:
        print(f"❌ Cloudinary 上傳失敗: {str(e)}")
        return None

def delete_image(public_id):
    """
    從 Cloudinary 刪除圖片
    
    Args:
        public_id: Cloudinary 的圖片 ID
    
    Returns:
        bool: 成功或失敗
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result['result'] == 'ok'
    except Exception as e:
        print(f"❌ Cloudinary 刪除失敗: {str(e)}")
        return False

def get_image_url(public_id, width=None, height=None):
    """
    取得圖片 URL (可選尺寸)
    
    Args:
        public_id: Cloudinary 的圖片 ID
        width: 寬度
        height: 高度
    
    Returns:
        str: 圖片 URL
    """
    if width and height:
        return cloudinary.CloudinaryImage(public_id).build_url(
            width=width,
            height=height,
            crop='fill'
        )
    return cloudinary.CloudinaryImage(public_id).build_url()