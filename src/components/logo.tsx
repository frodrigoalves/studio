
import { cn } from "@/lib/utils";
import * as React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  iconFill?: string;
  textFill?: string;
  transportesFill?: string;
}

export const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, iconFill = "#F29100", textFill = "currentColor", transportesFill = "currentColor", ...props }, ref) => {
    return (
      <svg
        ref={ref}
        className={cn("text-foreground", className)}
        viewBox="0 0 280 70" // Adjusted viewBox for better spacing
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <g transform="translate(10, 5)">
          {/* Icon Group */}
          <g>
            {/* The orange speech bubble shape */}
            <path
              d="M51.8,6.3c13.7,0,24.9,11.1,24.9,24.9S65.5,56,51.8,56V46.7c7.2,0,13.1-5.9,13.1-13.1s-5.9-13.1-13.1-13.1v-9.3h-2.6 C35.5,11.3,24.4,22.4,24.4,36.1c0,6.7,2.6,12.7,7,17.2l-6.7,6.7C11.9,48.5,6.2,39.9,6.2,31.1C6.2,17.4,17.3,6.3,31.1,6.3H51.8z"
              fill={iconFill}
              style={{ transition: 'fill 0.5s ease-in-out' }}
            />
            {/* The blue plus sign */}
            <path
              d="M48.1,54.3h-19.4V34.9H9.3v-9.3h19.4V6.2h19.4v19.4h19.4v9.3H48.1V54.3z"
              fill="#2C4E8A" // Kept as original blue
            />
          </g>

          {/* Text Group */}
          <text
            x="95"
            y="35"
            fontFamily="Inter, sans-serif"
            fontSize="34"
            fontWeight="bold"
            fill={textFill}
            style={{ transition: 'fill 0.5s ease-in-out' }}
          >
            TOPBUS
          </text>
          <text
            x="95"
            y="60"
            fontFamily="Inter, sans-serif"
            fontSize="22"
            fontWeight="500"
            fill={transportesFill}
            style={{ transition: 'fill 0.5s ease-in-out' }}
          >
            TRANSPORTES
          </text>
        </g>
      </svg>
    );
  }
);
Logo.displayName = "Logo";
