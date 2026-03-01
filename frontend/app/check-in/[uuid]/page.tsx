import { BatchResponse } from "@/lib/api";
import { CheckInShell } from "@/components/CheckInShell";

async function fetchBatch(uuid: string): Promise<BatchResponse | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/check-in/${uuid}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: { uuid: string };
}

export default async function CheckInPage({ params }: PageProps) {
  const { uuid } = params;
  const batch = await fetchBatch(uuid);

  return (
    <CheckInShell batch={batch ?? undefined} uuid={uuid} />
  );
}
