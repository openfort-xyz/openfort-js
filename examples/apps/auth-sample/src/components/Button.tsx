import {
  forwardRef,
  SVGProps,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
} from 'react';
import Link from 'next/link';
import clsx from 'clsx';

interface ArrowIconProps extends SVGProps<SVGSVGElement> {}

function ArrowIcon(props: ArrowIconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.5 6.5 3 3.5m0 0-3 3.5m3-3.5h-9"
      />
    </svg>
  );
}

const variantStyles = {
  primary: 'rounded-md bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700',
  primaryOrange:
    'rounded-md bg-orange-600 py-1 px-3 font-semibold text-white hover:bg-orange-500',
  secondary:
    'rounded-md bg-zinc-100 py-1 px-3 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400',
  filled: 'rounded-md bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700',
  outline:
    'rounded-md py-1 px-3 text-zinc-700 ring-1 ring-inset ring-zinc-900/10 hover:bg-zinc-900/2.5 hover:text-zinc-900',
  text: 'text-blue-600 hover:text-zinc-900',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  arrow?: 'left' | 'right';
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>['type'];
  icon?: React.ReactNode;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof variantStyles;
  arrow?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      icon,

      arrow,
      htmlType = 'button',
      className,
      ...props
    },
    ref
  ) {
    className = clsx(
      'inline-flex gap-0.5 justify-center overflow-hidden text-sm font-medium transition',
      variantStyles[variant],
      className
    );
    const showIcon = icon;

    let arrowIcon = (
      <ArrowIcon
        className={clsx(
          'mt-0.5 h-5 w-5',
          variant === 'text' && 'relative top-px',
          arrow === 'left' && '-ml-1 rotate-180',
          arrow === 'right' && '-mr-1'
        )}
      />
    );

    return (
      <button type={htmlType} ref={ref} className={className} {...props}>
        {props.children}
        {arrow === 'right' && arrowIcon}
      </button>
    );
  }
);

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton(
    {variant = 'primary', arrow, className, href, ...props},
    ref
  ) {
    className = clsx(
      'inline-flex gap-0.5 justify-center overflow-hidden text-sm font-medium transition',
      variantStyles[variant],
      className
    );

    return (
      <Link href={href || '#'} ref={ref} className={className} {...props}>
        {props.children}
      </Link>
    );
  }
);
