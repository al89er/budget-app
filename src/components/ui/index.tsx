import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Card Components
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("nm-card rounded-[32px] nm-flat transition-all duration-300 hover:nm-flat-hover hover:-translate-y-0.5 overflow-hidden", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-8 py-6", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-xl font-extrabold text-surface-800 leading-tight tracking-tight font-plus", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-8 pb-8 pt-2", className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-8 py-6 flex items-center bg-transparent border-t border-surface-100/10", className)} {...props} />
  );
}

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "nm-button inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none hover:nm-button-hover active:nm-button-active";
    
    const variants = {
      primary: "text-brand-700",
      secondary: "text-surface-800",
      danger: "text-rose-700",
      ghost: "shadow-none hover:nm-button-hover active:nm-button-active",
      outline: "border border-surface-200/50 hover:border-transparent"
    };

    const sizes = {
      sm: "h-10 px-4 text-xs",
      md: "h-12 px-6 text-sm",
      lg: "h-14 px-8 text-base"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-extrabold uppercase tracking-widest text-surface-600 mb-3 px-2 font-dm">{label}</label>}
        <input
          type={type}
          className={cn(
            "nm-inset-deep flex h-12 w-full rounded-2xl border-none px-5 py-3 text-sm font-medium text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-dm",
            error && "text-rose-700 placeholder:text-rose-300/50",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-xs text-rose-700 px-2 font-bold">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-extrabold uppercase tracking-widest text-surface-600 mb-3 px-2 font-dm">{label}</label>}
        <div className="relative">
          <select
            className={cn(
              "nm-inset-deep flex h-12 w-full rounded-2xl border-none px-5 py-3 text-sm font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none bg-transparent font-dm",
              error && "text-rose-600/90",
              className
            )}
            ref={ref}
            {...props}
          >
            <option value="" disabled className="bg-surface-50">Select an option</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface-50 text-surface-800">{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600/90 px-2 font-bold">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

// Modal Component
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-800/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg nm-flat rounded-[40px] overflow-hidden m-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="px-10 py-8 flex items-center justify-between">
          <h2 className="text-2xl font-black text-surface-800 tracking-tight font-plus">{title}</h2>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl nm-button text-surface-400 hover:text-brand-600/90 transition-all hover:scale-105"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="px-10 pb-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
