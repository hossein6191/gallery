import type { SVGProps } from "react";

export function EditIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path strokeDasharray="44" strokeDashoffset="44" d="M7 17v-4l10 -10l4 4l-10 10h-4">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.3s" dur="0.5s" to="0" />
        </path>
        <path strokeDasharray="20" strokeDashoffset="20" d="M3 21h18">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" to="0" />
        </path>
        <path strokeDasharray="8" strokeDashoffset="8" d="M14 6l4 4">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" to="0" />
        </path>
      </g>
    </svg>
  );
}
