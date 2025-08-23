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
