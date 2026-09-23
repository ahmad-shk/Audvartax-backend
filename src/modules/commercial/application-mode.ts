import { getCommercialService } from "./commercial.catalog.js";

export type ApplicationMode = "paid" | "contact";

// This registry mirrors the frontend commercial catalog's applicationMode values.
// Paid remains the default for catalog services; only explicit contact services are listed here.\n// Backend billing is therefore impossible for a contact-only service.
const contactServiceSlugs = new Set([
  "uk-corporate-tax",
  "uk-vat-filing",
  "pak-ntn-registration",
  "pak-become-filer",
  "pak-salary-return",
  "pak-business-return",
  "pak-dnfbp-certificate",
  "pak-pseb",
  "pak-psw",
]);

export function getApplicationMode(serviceSlug: string): ApplicationMode | null {
  if (!getCommercialService(serviceSlug)) return null;
  return contactServiceSlugs.has(serviceSlug) ? "contact" : "paid";
}

export function isPaidService(serviceSlug: string) {
  return getApplicationMode(serviceSlug) === "paid";
}
