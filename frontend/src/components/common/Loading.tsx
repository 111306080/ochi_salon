interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const Loading = ({ size = 'medium', color = 'blue' }: LoadingProps) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-10 h-10 border-3',
    large: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} border-${color}-600 border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
};

export default Loading;