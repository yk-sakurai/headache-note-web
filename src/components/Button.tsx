import Link from "next/link";
import { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
}

interface ButtonAsButton extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "disabled"> {
  href?: never;
}

interface ButtonAsLink extends BaseButtonProps {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  type?: never;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)] shadow-sm hover:border-[color:var(--brand-primary-hover)] hover:bg-[color:var(--brand-primary-hover)] active:bg-[color:var(--brand-primary-active)]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] active:bg-[color:var(--brand-mint-bg)]",
};

export default function Button({
  children,
  variant = "primary",
  disabled = false,
  href,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium calm-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] disabled:pointer-events-none disabled:opacity-50";
  
  const composedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (href) {
    const linkProps = props as ButtonAsLink;
    return (
      <Link 
        href={href} 
        className={`${composedClassName} ${disabled ? "pointer-events-none opacity-50" : ""}`}
        onClick={linkProps.onClick}
        aria-disabled={disabled}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={composedClassName}
      disabled={disabled}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
