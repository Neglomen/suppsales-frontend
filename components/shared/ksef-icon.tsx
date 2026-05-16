import { SVGProps } from "react";

export const KsefIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 50" {...props}>
    <rect width="100" height="50" rx="4" fill="#B30000" />
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dy=".3em"
      fontSize="24"
      fontWeight="bold"
      fill="white"
      fontFamily="Arial, sans-serif"
    >
      KSeF
    </text>
  </svg>
);
