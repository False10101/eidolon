import { useEffect, useState } from 'react';

export default function SlipView({ slipPath }) {
    const [imgUrl, setImgUrl] = useState(null);

    useEffect(() => {
        if (!slipPath) return;

        const fetchImage = async () => {
            try {
                const res = await fetch(`/api/admin/topups/slips?path=${encodeURIComponent(slipPath)}`);
                
                if (res.ok) {
                    const blob = await res.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    setImgUrl(objectUrl);
                } else {
                    console.error("Failed to load image");
                }
            } catch (err) {
                console.error("Image fetch error", err);
            }
        };

        fetchImage();

        // Cleanup memory when the component unmounts
        return () => {
            if (imgUrl) URL.revokeObjectURL(imgUrl);
        };
    }, [slipPath]);

    if (!imgUrl) return <div className="h-[180px] w-[180px] bg-gray-200 animate-pulse rounded-lg" />;

    return (
        <img 
            src={imgUrl} 
            alt="Payment slip" 
            className="max-h-[180px] rounded-lg object-contain" 
        />
    );
}