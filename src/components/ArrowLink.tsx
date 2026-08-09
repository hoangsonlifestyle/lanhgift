import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type ArrowLinkProps = {
  children: ReactNode;
  light?: boolean;
  onClick?: () => void;
};

export function ArrowLink({ children, light = false, onClick }: ArrowLinkProps) {
  return (
    <button onClick={onClick} className={`arrow-link ${light ? "arrow-link-light" : ""}`}>
      {children}
      <ArrowUpRight size={15} strokeWidth={1.5} />
    </button>
  );
}
