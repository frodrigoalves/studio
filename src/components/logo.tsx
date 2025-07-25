
import { cn } from "@/lib/utils";
import * as React from "react";

export const Logo = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      className={cn("text-foreground", className)}
      viewBox="0 0 260 70"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g>
        <path
          d="M48.113 54.333h-19.4v-19.4h-19.4v-9.267h19.4v-19.4h19.4v19.4h19.4v9.267h-19.4v19.4Z"
          fill="#2C4E8A"
        />
        <path
          d="M51.84 6.267c13.733 0 24.866 11.133 24.866 24.866s-11.133 24.867-24.866 24.867V46.733c7.2 0 13.067-5.866 13.067-13.066s-5.867-13.067-13.067-13.067v-9.267h-2.6c-13.733 0-24.867 11.133-24.867 24.867 0 6.666 2.6 12.666 7 17.2l-6.667 6.666C11.94 48.467 6.206 39.933 6.206 31.133 6.206 17.4 17.34 6.267 31.073 6.267h20.767Z"
          fill="#F29100"
        />
      </g>
      <text
        x="90"
        y="30"
        fontFamily="Inter, sans-serif"
        fontSize="30"
        fontWeight="bold"
        fill="currentColor"
      >
        TOPBUS
      </text>
      <text
        x="90"
        y="55"
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="500"
        fill="currentColor"
      >
        TRANSPORTES S/A
      </text>
    </svg>
  );
});
Logo.displayName = "Logo";
