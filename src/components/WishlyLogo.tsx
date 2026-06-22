import type { ImgHTMLAttributes } from "react";

type WishlyLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { width: 88, height: 34, widthClass: "w-[88px] sm:w-[96px]" },
  md: { width: 120, height: 46, widthClass: "w-[120px] sm:w-[132px]" },
  lg: { width: 148, height: 58, widthClass: "w-[140px] sm:w-[156px]" },
};

export function WishlyLogo({
  size = "md",
  className = "",
  ...props
}: WishlyLogoProps) {
  const dimensions = sizeMap[size];

  return (
    <img
      src="/brand/wishly-logo-transparent.png"
      alt="Wishly"
      width={dimensions.width}
      height={dimensions.height}
      className={`block ${dimensions.widthClass} h-auto max-w-full object-contain ${className}`}
      {...props}
    />
  );
}
