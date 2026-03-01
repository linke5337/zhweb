"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { cn } from "@/lib/utils";
import axios from "axios";

// ── Country codes ──────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+86",  flag: "🇨🇳", name: "中国 China" },
  { code: "+81",  flag: "🇯🇵", name: "日本 Japan" },
  { code: "+82",  flag: "🇰🇷", name: "한국 Korea" },
  { code: "+852", flag: "🇭🇰", name: "香港 HK" },
  { code: "+853", flag: "🇲🇴", name: "澳门 Macao" },
  { code: "+886", flag: "🇹🇼", name: "台湾 Taiwan" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "+66",  flag: "🇹🇭", name: "Thailand" },
  { code: "+84",  flag: "🇻🇳", name: "Vietnam" },
  { code: "+62",  flag: "🇮🇩", name: "Indonesia" },
  { code: "+63",  flag: "🇵🇭", name: "Philippines" },
  { code: "+95",  flag: "🇲🇲", name: "Myanmar" },
  { code: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "+856", flag: "🇱🇦", name: "Laos" },
  { code: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "+34",  flag: "🇪🇸", name: "Spain" },
  { code: "+7",   flag: "🇷🇺", name: "Russia" },
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+90",  flag: "🇹🇷", name: "Turkey" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "+52",  flag: "🇲🇽", name: "Mexico" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
];

// ── Shared input style ─────────────────────────────────────────────────────
const inputCls = (err?: boolean) =>
  cn(
    "w-full h-10 rounded border px-3 text-sm bg-white text-slate-800",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "placeholder:text-slate-300 transition-colors",
    err ? "border-red-400 bg-red-50" : "border-slate-300 hover:border-slate-400"
  );

const selectCls = cn(
  "h-10 rounded border border-slate-300 hover:border-slate-400 bg-white px-2 text-sm",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
  "text-slate-800 transition-colors"
);

// ── Label component ────────────────────────────────────────────────────────
function FieldLabel({
  zh, ja, en, required, optional,
}: {
  zh: string; ja: string; en: string;
  required?: boolean; optional?: boolean;
}) {
  return (
    <label className="block text-[13px] text-slate-700 mb-1.5 leading-snug">
      {en}{" "}
      <span className="text-slate-500">
        ({zh} / {ja})
      </span>
      {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      {optional && (
        <span className="ml-2 text-[11px] font-normal text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
          选填 / Optional
        </span>
      )}
      :
    </label>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  batchId?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

// ── Main component ──────────────────────────────────────────────────────────
export function CheckInForm({ batchId }: Props) {
  // Required
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [countryCode, setCountryCode] = useState("+86");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  // Optional
  const [arrivalDatetime, setArrivalDatetime] = useState("");
  const [departureDatetime, setDepartureDatetime] = useState("");
  const [occupation, setOccupation] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())        e.name    = "Please enter full name / 请输入姓名 / 名前を入力してください";
    if (!address.trim())     e.address = "Please enter address / 请输入地址 / 住所を入力してください";
    if (!phoneNumber.trim()) e.phone   = "Please enter phone number / 请输入电话号码 / 電話番号を入力してください";
    if (photos.length === 0) e.photos  = "Please upload at least 1 photo / 请至少上传1张照片 / 写真を1枚以上アップロードしてください";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("address", address.trim());
      fd.append("phone_country_code", countryCode);
      fd.append("phone_number", phoneNumber.trim());
      if (batchId)            fd.append("batch_id",           batchId);
      if (arrivalDatetime)    fd.append("arrival_datetime",   arrivalDatetime);
      if (departureDatetime)  fd.append("departure_datetime", departureDatetime);
      if (occupation.trim())  fd.append("occupation",         occupation.trim());
      if (age.trim())         fd.append("age",                age.trim());
      if (gender)             fd.append("gender",             gender);
      if (nationality.trim()) fd.append("nationality",        nationality.trim());
      if (passportNumber.trim()) fd.append("passport_number", passportNumber.trim());
      photos.forEach((f) => fd.append("photos", f, f.name));

      await axios.post("/api/check-in/simple", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Submission failed. Please try again. / 提交失败，请重试 / 送信に失敗しました";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  // ── Success ─────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-scale-in">
        <div className="rounded-full bg-emerald-100 p-5 mb-5">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          登记完成 / 登録完了 / Registration Complete
        </h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
          信息已成功提交，感谢您的配合。
          <br />
          ご協力ありがとうございます。
          <br />
          Thank you for your cooperation.
        </p>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* ── Notice banner ── */}
      <div className="text-[13px] text-slate-700 border-b border-slate-200 pb-4 mb-5 leading-relaxed">
        Only the representative needs to fill in
        <span className="text-slate-500">
          （只需要代表者填写 / 代表者のみ記入してください）
        </span>
        :
      </div>

      {/* ── Required fields ─────────────────────────────────────────── */}

      {/* Full Name */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="全名" ja="フルネーム" en="Full Name" required />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls(!!errors.name)}
          placeholder=""
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Address */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="地址" ja="住所" en="Address" required />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputCls(!!errors.address)}
          placeholder=""
        />
        {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
      </div>

      {/* ── Optional fields ─────────────────────────────────────────── */}

      {/* Arrival */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="抵达日期和时间" ja="到着日時" en="Date and Time of Arrival" optional />
        <input
          type="datetime-local"
          value={arrivalDatetime}
          onChange={(e) => setArrivalDatetime(e.target.value)}
          className={inputCls()}
        />
      </div>

      {/* Departure */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="出发日期和时间" ja="出発日時" en="Date and Time of Departure" optional />
        <input
          type="datetime-local"
          value={departureDatetime}
          onChange={(e) => setDepartureDatetime(e.target.value)}
          className={inputCls()}
        />
      </div>

      {/* Occupation */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="职业" ja="職業" en="Occupation" optional />
        <input
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          className={inputCls()}
          placeholder=""
        />
      </div>

      {/* Age */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="年龄" ja="年齢" en="Age" optional />
        <input
          type="number"
          min={0}
          max={150}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className={inputCls()}
          placeholder=""
        />
      </div>

      {/* Sex */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="性别" ja="性別" en="Sex" optional />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={cn(selectCls, "w-full")}
        >
          <option value="">— 请选择 / Please select —</option>
          <option value="M">Male（男 / 男）</option>
          <option value="F">Female（女 / 女）</option>
        </select>
      </div>

      {/* Nationality */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="国籍" ja="国籍" en="Nationality" optional />
        <input
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className={inputCls()}
          placeholder=""
        />
      </div>

      {/* Passport */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="护照号" ja="パスポート番号" en="Passport No." optional />
        <input
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
          className={cn(inputCls(), "font-mono tracking-widest")}
          placeholder=""
        />
      </div>

      {/* Phone — required */}
      <div className="border-b border-slate-100 py-4">
        <FieldLabel zh="电话号码" ja="電話番号" en="Phone Number" required />
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={cn(selectCls, "shrink-0 min-w-[140px]")}
          >
            {COUNTRY_CODES.map(({ code, flag, name: cname }) => (
              <option key={code + cname} value={code}>
                {flag} {code}  {cname}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={cn(inputCls(!!errors.phone), "flex-1")}
            placeholder="90-0000-0000"
          />
        </div>
        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
      </div>

      {/* ── Photos — required ──────────────────────────────────────── */}
      <div className="pt-5 pb-2">
        <PhotoUploader files={photos} onChange={setPhotos} error={errors.photos} />
      </div>

      {/* ── Error banner ── */}
      {status === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {/* ── Submit ── */}
      <div className="pt-6 pb-4">
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "w-full h-11 rounded text-white text-sm font-semibold transition-colors",
            "flex items-center justify-center gap-2",
            status === "submitting"
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          )}
        >
          {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "submitting"
            ? "提交中… / Submitting…"
            : "提交 / 登録する / Submit"}
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          提交后无法修改 / 送信後は変更できません / Cannot be changed after submission
        </p>
      </div>
    </form>
  );
}
