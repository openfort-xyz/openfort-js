import Image from "next/image";
import React from "react";

interface NFTDisplayProps {
  imageUrl: string; // URL or base64-encoded image string
  alt?: string; // Optional alt text for the image
}

const NFTDisplay: React.FC<NFTDisplayProps> = ({
  imageUrl,
  alt = "NFT Image",
}) => {
  return (
    <div className="flex justify-center items-center w-full my-2.5 pt-5 pb-2">
      <Image
        src={imageUrl}
        alt={alt}
        width={150}
        height={150}
        className="rounded-lg object-cover"
      />
    </div>
  );
};

export default NFTDisplay;
