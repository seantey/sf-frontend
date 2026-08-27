"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import Field, { CONTROL } from "@/components/ui/Field";
import PhotoField from "./PhotoField";
import Button, { buttonClasses } from "@/components/ui/Button";
import {
  ADDRESS_FIELDS,
  CONTACT_FIELD_GROUPS,
  addressFieldName,
} from "@/lib/contacts/schema";
import {
  ADDRESS_TYPES,
  EMPTY_FORM_STATE,
  type AddressFormValues,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

const BLANK_ADDRESS: AddressFormValues = {
  type: "Home",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

/** One editable address; every control is named `addresses[<index>][<field>]`. */
function AddressRow({
  index,
  values,
}: {
  index: number;
  values: AddressFormValues;
}) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-hairline p-3 sm:grid-cols-3">
      <legend className="sr-only">Address {index + 1}</legend>
      {ADDRESS_FIELDS.map((field) => {
        const id = `field-address-${index}-${field.name}`;
        return (
          <div key={field.name} className={field.name === "street" ? "sm:col-span-2" : undefined}>
            <label
              htmlFor={id}
              className="mb-1.5 block text-[13px] font-medium text-foreground"
            >
              {field.label}
            </label>
            {field.name === "type" ? (
              <select
                id={id}
                name={addressFieldName(index, "type")}
                defaultValue={values.type}
                className={`${CONTROL} border-border focus:border-primary`}
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type="text"
                name={addressFieldName(index, field.name)}
                defaultValue={values[field.name]}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                className={`${CONTROL} border-border focus:border-primary`}
              />
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  // One spare blank row is always offered; a blank row is dropped on save.
  const [blankRowCount, setBlankRowCount] = useState(1);

  function valueFor(name: keyof ContactInput): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  const addressRows: AddressFormValues[] = [
    ...(state.addresses ??
      contact?.addresses.map((address) => ({
        type: address.type,
        street: address.street ?? "",
        city: address.city ?? "",
        state: address.state ?? "",
        postal_code: address.postal_code ?? "",
        country: address.country ?? "",
      })) ??
      []),
    ...Array.from({ length: blankRowCount }, () => BLANK_ADDRESS),
  ];

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={valueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-4">
        <legend className="sr-only">Addresses</legend>

        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            As many as they have. Clear a row to remove it.
          </p>
        </div>

        {addressRows.map((values, index) => (
          <AddressRow key={index} index={index} values={values} />
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setBlankRowCount((count) => count + 1)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Add another address
        </Button>
      </fieldset>

      <PhotoField contact={contact} error={state.fieldErrors?.photo} />

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
