import { SVGProps } from "react";

export const AllegroIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    {...props}
    // Ikona z https://worldvectorlogo.com/logo/allegro-1
  >
    <path
      fill="#FF5A00"
      d="M256 512c141.385 0 256-114.615 256-256S397.385 0 256 0 0 114.615 0 256s114.615 256 256 256z"
    />
    <path
      fill="#FFF"
      d="m194.21 161.85-22.38 67.48h-41.53l-22.37-67.48h-47.28l69.65 188.3h41.53l69.65-188.3z"
    />
    <path
      fill="#FFF"
      d="M370.4 219.74c0-32.06-25.26-57.89-62.46-57.89H256v188.3h51.94c37.2 0 62.46-25.83 62.46-57.89v-13.44c0-10.9-3.95-20.59-10.23-28.05 6.28-7.46 10.23-17.15 10.23-28.05v-3.98zm-62.46 104.54H304V289h3.94c12.21 0 19.37 8.39 19.37 19.95v13.44c0 11.56-7.16 19.95-19.37 19.95zm0-85.16H304v-31.5h3.94c12.21 0 19.37 6.83 19.37 17.71v3.98c0 10.88-7.16 17.71-19.37 17.71z"
    />
  </svg>
);

export const BaseLinkerIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="24"
      height="24"
      {...props}
    >
      <path fill="#0581FF" d="M0 0h256v256H0z" />
      <path
        fill="#fff"
        d="M171.2 128l-43.2-43.2-43.2 43.2 43.2 43.2zM128 224L32 128l96-96 96 96z"
      />
    </svg>
  );
};

export const SuusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 60"
    width="100" // Domyślna szerokość
    height="30" // Domyślna wysokość
    {...props}
  >
    <defs>
      <style>{`.cls-suus{fill:#003c71}`}</style>
    </defs>
    <path
      className="cls-suus"
      d="M29.5 35.8c-7.3 0-12.2-4.9-12.2-12.5s4.9-12.5 12.2-12.5 12.2 4.9 12.2 12.5-4.9 12.5-12.2 12.5zm0-20.3c-4.4 0-7.5 3.3-7.5 7.8s3.1 7.8 7.5 7.8 7.5-3.3 7.5-7.8-3.1-7.8-7.5-7.8zM61.9 35.8h-4.6V11h4.6v24.8zM87.4 35.8c-7.3 0-12.2-4.9-12.2-12.5s4.9-12.5 12.2-12.5 12.2 4.9 12.2 12.5-4.9 12.5-12.2 12.5zm0-20.3c-4.4 0-7.5 3.3-7.5 7.8s3.1 7.8 7.5 7.8 7.5-3.3 7.5-7.8-3.1-7.8-7.5-7.8zM119.8 35.8h-4.6V11h4.6v24.8z"
    />
  </svg>
);

export const ABIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="AB S.A. Logo"
  >
    <rect width="100" height="40" rx="4" fill="#E40521" />
    <path
      d="M21.94 28.5H16.18L13.54 11.5H19.3L20.62 21.82L21.94 11.5H27.58L29.02 21.82L30.34 11.5H36.1L33.46 28.5H27.82L24.7 15.1L21.94 28.5Z"
      fill="white"
    />
    <path
      d="M56.5 17.68C56.5 14.08 53.86 11.5 50.08 11.5H41.5V28.5H47.14V22.42H49.6L52.96 28.5H59.5L55.12 21.1C56 20.26 56.5 19.06 56.5 17.68ZM47.14 19.48V14.44H50.02C51.94 14.44 53.14 15.64 53.14 17.44C53.14 19.24 51.94 20.44 50.02 20.44L49.06 20.42L47.14 19.48Z"
      fill="white"
    />
  </svg>
);
