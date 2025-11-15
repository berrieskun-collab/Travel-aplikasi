import React from 'react';

const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21v-4.5m0-4.5H2.25M12 10.5H19.5m-8.25 0V5.25m0 0H12c2.167 0 4.333 1.083 5.5 3.5V12m-7.5-4.5H2.25M12 5.25v3.75m0-3.75c-2.167 0-4.333 1.083-5.5 3.5V12m7.5-3.75H12"
    />
  </svg>
);

export default GlobeIcon;