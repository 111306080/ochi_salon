import Rating from './Rating';
import Button from './Button';

interface Designer {
  id: string;
  name: string;
  photo: string;
  rating: number;
  reviewCount: number;
  styleDescription: string;
}

interface DesignerCardProps {
  designer: Designer;
  onClick: () => void;
}

const DesignerCard = ({ designer, onClick }: DesignerCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <img
        src={designer.photo}
        alt={designer.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{designer.name}</h3>
        <div className="flex items-center mb-2">
          <Rating rating={designer.rating} readonly size="small" />
          <span className="ml-2 text-sm text-gray-600">
            ({designer.reviewCount} 則評價)
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          {designer.styleDescription}
        </p>
        <Button variant="primary" onClick={onClick} className="w-full">
          查看詳情
        </Button>
      </div>
    </div>
  );
};

export default DesignerCard;