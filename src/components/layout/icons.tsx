import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="currentColor">
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
        <path d="M168 95.87a8 8 0 0 1-8.15 8L136 104v48a8 8 0 0 1-16 0v-48l-23.85-.13a8 8 0 0 1-5.54-13.63l32-32a8 8 0 0 1 11.32 0l32 32a8 8 0 0 1-2.61 11.63Z" />
        <path d="M104 176a8 8 0 0 1-8-8v-16h64v16a8 8 0 0 1-16 0v-8h-24v8a8 8 0 0 1-8 8Z" />
      </g>
    </svg>
  );
}
