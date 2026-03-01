"use client";

import { UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface GuestField {
  furigana: string;
  name: string;
  gender: "M" | "F";
  phone: string;
  date_of_birth: string;
  age: number;
  address: string;
  occupation: string;
  nationality: string;
  passport_number: string;
  previous_stay: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
}

interface Props {
  index: number;
  form: UseFormReturn<{ guests: GuestField[] }>;
  onRemove?: () => void;
  canRemove: boolean;
}

function FieldRow({
  label,
  sub,
  error,
  children,
}: {
  label: string;
  sub: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start border-b border-slate-100 py-3 last:border-0">
      <div className="pt-1.5 shrink-0">
        <p className="text-sm font-medium text-slate-800 leading-tight">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <div>
        {children}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

type ErrMap = Partial<Record<keyof GuestField, { message?: string }>>;

export function GuestFormSection({ index, form, onRemove, canRemove }: Props) {
  const { t } = useLanguage();
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const guestErrors = (errors.guests?.[index] ?? {}) as ErrMap;

  function handleDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dob = e.target.value;
    setValue(`guests.${index}.date_of_birth`, dob);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      setValue(`guests.${index}.age`, age >= 0 ? age : 0);
    }
  }

  const sectionLabel =
    index === 0
      ? `${t.primaryGuest} / ${t.primaryGuestSub}`
      : `${t.companion} ${index} / ${t.companionSub} ${index}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3",
          index === 0 ? "bg-blue-600" : "bg-slate-700"
        )}
      >
        <span className="text-white font-semibold text-sm">{sectionLabel}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Fields */}
      <div className="px-5 pb-2">
        <FieldRow label={t.furigana} sub={t.furiganaSub} error={guestErrors.furigana?.message}>
          <Input
            {...register(`guests.${index}.furigana`, { required: t.furiganaErr })}
            placeholder={t.furiganaPlaceholder}
            className={cn(guestErrors.furigana && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.name} sub={t.nameSub} error={guestErrors.name?.message}>
          <Input
            {...register(`guests.${index}.name`, { required: t.nameErr })}
            placeholder={t.namePlaceholder}
            className={cn(guestErrors.name && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.gender} sub={t.genderSub} error={guestErrors.gender?.message}>
          <div className="flex gap-6 pt-1">
            {(["M", "F"] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  value={g}
                  {...register(`guests.${index}.gender`, { required: t.genderErr })}
                  className="accent-blue-600"
                />
                <span className="text-sm">{g === "M" ? t.male : t.female}</span>
              </label>
            ))}
          </div>
        </FieldRow>

        <FieldRow label={t.phone} sub={t.phoneSub}>
          <Input
            {...register(`guests.${index}.phone`)}
            type="tel"
            placeholder={t.phonePlaceholder}
          />
        </FieldRow>

        <FieldRow label={t.dob} sub={t.dobSub} error={guestErrors.date_of_birth?.message}>
          <div className="flex gap-3 items-center">
            <Input
              type="date"
              {...register(`guests.${index}.date_of_birth`, {
                required: t.dobErr,
                onChange: handleDobChange,
              })}
              className={cn("flex-1", guestErrors.date_of_birth && "border-red-400")}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                {...register(`guests.${index}.age`, {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 150,
                })}
                className="w-20 text-center"
                placeholder={t.age}
              />
              <span className="text-sm text-slate-500 whitespace-nowrap">{t.ageSub}</span>
            </div>
          </div>
        </FieldRow>

        <FieldRow label={t.address} sub={t.addressSub} error={guestErrors.address?.message}>
          <Input
            {...register(`guests.${index}.address`, { required: t.addressErr })}
            placeholder={t.addressPlaceholder}
            className={cn(guestErrors.address && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.occupation} sub={t.occupationSub} error={guestErrors.occupation?.message}>
          <Input
            {...register(`guests.${index}.occupation`, { required: t.occupationErr })}
            placeholder={t.occupationPlaceholder}
            className={cn(guestErrors.occupation && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.nationality} sub={t.nationalitySub} error={guestErrors.nationality?.message}>
          <Input
            {...register(`guests.${index}.nationality`, { required: t.nationalityErr })}
            placeholder={t.nationalityPlaceholder}
            className={cn(guestErrors.nationality && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.passport} sub={t.passportSub} error={guestErrors.passport_number?.message}>
          <Input
            {...register(`guests.${index}.passport_number`, { required: t.passportErr })}
            placeholder={t.passportPlaceholder}
            className={cn(
              "font-mono tracking-widest uppercase",
              guestErrors.passport_number && "border-red-400"
            )}
          />
        </FieldRow>

        <FieldRow label={t.previousStay} sub={t.previousStaySub} error={guestErrors.previous_stay?.message}>
          <Input
            {...register(`guests.${index}.previous_stay`, { required: t.previousStayErr })}
            placeholder={t.previousStayPlaceholder}
            className={cn(guestErrors.previous_stay && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.destination} sub={t.destinationSub} error={guestErrors.destination?.message}>
          <Input
            {...register(`guests.${index}.destination`, { required: t.destinationErr })}
            placeholder={t.destinationPlaceholder}
            className={cn(guestErrors.destination && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.arrival} sub={t.arrivalSub} error={guestErrors.arrival_date?.message}>
          <Input
            type="date"
            {...register(`guests.${index}.arrival_date`, { required: t.arrivalErr })}
            className={cn(guestErrors.arrival_date && "border-red-400")}
          />
        </FieldRow>

        <FieldRow label={t.departure} sub={t.departureSub} error={guestErrors.departure_date?.message}>
          <Input
            type="date"
            {...register(`guests.${index}.departure_date`, { required: t.departureErr })}
            className={cn(guestErrors.departure_date && "border-red-400")}
          />
        </FieldRow>
      </div>
    </div>
  );
}
