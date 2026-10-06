import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Botão do painel: variantes nas cores do sistema (ação do app, cor da
 * pessoa ativa, fantasma e reservado). Sem overrides no ponto de uso.
 */
const actionButtonVariants = cva(
  "focus inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-card hover:bg-primary/90",
        accent:
          "bg-accent text-accent-foreground shadow-card hover:brightness-105",
        person:
          "bg-person-active text-person-foreground shadow-card hover:brightness-110",
        ghost:
          "border-2 border-border bg-card text-foreground hover:border-border-strong hover:shadow-soft",
        reserved:
          "border-2 border-dashed border-border-strong/70 bg-transparent text-muted-foreground hover:border-primary hover:text-primary",
      },
      size: {
        sm: "min-h-9 px-4 text-[0.82rem]",
        md: "min-h-11 px-5 text-[0.9rem]",
        lg: "min-h-14 px-7 text-[1.02rem]",
        wide: "min-h-14 w-full px-6 text-[1.02rem]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ActionButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof actionButtonVariants> {
  asChild?: boolean;
}

export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ActionButtonProps
>(({ className, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(actionButtonVariants({ variant, size }), className)}
    {...props}
  />
));
ActionButton.displayName = "ActionButton";

export { actionButtonVariants };
