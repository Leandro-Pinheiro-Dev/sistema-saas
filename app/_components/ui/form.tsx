"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

export const Form = FormProvider;

export function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}

export function FormControl({ children }: { children: React.ReactElement }) {
  return children;
}

export function FormMessage() {
  const {
    formState: { errors },
  } = useFormContext();

  const error = Object.values(errors)[0];

  if (!error) return null;

  return (
    <p className="text-sm text-red-500">
      {String((error as { message?: string }).message ?? "")}
    </p>
  );
}
