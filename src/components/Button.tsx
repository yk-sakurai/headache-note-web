import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
}

interface ButtonAsButton extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: never;
}

interface ButtonAsLink extends BaseButtonProps {
  href: string;
  onClick?: never;
  type?: never;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "text-[color:var(--brand-on-primary)] bg-[color:var(--brand-primary)] hover:brightness-95",
  secondary:
    "text-gray-700 bg-gray-200 hover:text-gray-900 hover:bg-gray-300",
};

export default function Button({
  children,
  variant = "primary",
  disabled = false,
  href,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const className = `${baseStyles} ${variantStyles[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={className}
      disabled={disabled}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
