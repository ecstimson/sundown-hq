import React from "react";
import horizontalGold from "../../assets/branding/horizontal_gold.svg";
import iconGold from "../../assets/branding/icon_gold.svg";
import stackedGold from "../../assets/branding/stacked_gold.svg";
import horizontalWhite from "../../assets/branding/horizontal_white.svg";
import iconWhite from "../../assets/branding/icon_white.svg";
import stackedWhite from "../../assets/branding/stacked_white.svg";

export type BrandLogoVariant = "horizontal" | "icon" | "stacked";
export type BrandLogoColor = "gold" | "white";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  color?: BrandLogoColor;
  className?: string;
}

const LOGO_MAP: Record<BrandLogoColor, Record<BrandLogoVariant, string>> = {
  gold: {
    horizontal: horizontalGold,
    icon: iconGold,
    stacked: stackedGold,
  },
  white: {
    horizontal: horizontalWhite,
    icon: iconWhite,
    stacked: stackedWhite,
  },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "horizontal",
  color = "gold",
  className = "",
}) => {
  const src = LOGO_MAP[color][variant];

  // Default class if none provided, but we want flexibility.
  // We'll rely on consumer to set height/width via className.
  return (
    <img
      src={src}
      alt="Sundown HQ"
      className={`block object-contain ${className}`}
    />
  );
};
