"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

// Detect mobile/touch device
function useIsMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

// Mobile drawer-based select content
function MobileSelectContent({ children, label, open, onOpenChange, value, onValueChange }) {
  // Extract items from children for drawer rendering
  const items = React.Children.toArray(children).flatMap(child => {
    if (!child?.props?.children) return [];
    return React.Children.toArray(child.props.children);
  }).filter(c => c?.props?.value !== undefined);

  // Also handle flat children (SelectItem directly)
  const flatItems = React.Children.toArray(children).filter(c => c?.props?.value !== undefined);
  const allItems = items.length > 0 ? items : flatItems;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[60vh]">
        {label && (
          <DrawerHeader>
            <DrawerTitle className="text-sm">{label}</DrawerTitle>
          </DrawerHeader>
        )}
        <div className="overflow-y-auto p-2 pb-8">
          {allItems.map((item, i) => {
            const isSelected = item.props.value === value;
            return (
              <button
                key={item.props.value ?? i}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-4 py-3 text-sm transition-colors",
                  isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent/50 text-foreground"
                )}
                onClick={() => { onValueChange?.(item.props.value); onOpenChange(false); }}
              >
                {item.props.children}
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Smart SelectContent: drawer on mobile, popover on desktop
const SelectContent = React.forwardRef(({ className, children, position = "popper", label, ...props }, ref) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // We need access to the Select context — use a wrapper that reads open state
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className="hidden"
          position={position}
          {...props}
        >
          <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
})
SelectContent.displayName = SelectPrimitive.Content.displayName

// MobileSelect: a full replacement for Select on touch devices
export function MobileSelect({ value, onValueChange, children, label, placeholder, triggerClassName }) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        {children}
      </Select>
    );
  }

  // Find trigger and content children
  const triggerChild = React.Children.toArray(children).find(c => c?.type?.displayName === 'SelectTrigger');
  const contentChild = React.Children.toArray(children).find(c => c?.type?.displayName === 'SelectContent');

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          triggerClassName
        )}
        onClick={() => setOpen(true)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder || 'Select...'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      <MobileSelectContent
        open={open}
        onOpenChange={setOpen}
        value={value}
        onValueChange={onValueChange}
        label={label}
      >
        {contentChild?.props?.children}
      </MobileSelectContent>
    </>
  );
}

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}