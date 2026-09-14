import type {
  BusinessHourSlot,
  CreateNodeFormValues,
  FormErrors,
} from "../types";

/**
 * Simple, dependency-free form validation helpers.
 * Returns an object keyed by field name; an empty object means "valid".
 */

export function validateNodeForm({
  title,
  description,
  type,
}: CreateNodeFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!title || !title.trim()) {
    errors.title = "Title is required.";
  } else if (title.trim().length > 80) {
    errors.title = "Title must be 80 characters or fewer.";
  }

  if (!description || !description.trim()) {
    errors.description = "Description is required.";
  } else if (description.trim().length > 300) {
    errors.description = "Description must be 300 characters or fewer.";
  }

  const allowedTypes = ["sendMessage", "addComment", "businessHours"];
  if (!type || !allowedTypes.includes(type)) {
    errors.type = "Please select a valid node type.";
  }

  return errors;
}

export interface BusinessHourErrors {
  day?: string;
  open?: string;
  close?: string;
}

export function validateBusinessHour({
  day,
  open,
  close,
}: BusinessHourSlot): BusinessHourErrors {
  const errors: BusinessHourErrors = {};
  if (!day) errors.day = "Day is required.";
  if (!open) errors.open = "Open time is required.";
  if (!close) errors.close = "Close time is required.";
  if (open && close && open >= close) {
    errors.close = "Close time must be after open time.";
  }
  return errors;
}

export function isValid(errors: object): boolean {
  return Object.keys(errors).length === 0;
}
