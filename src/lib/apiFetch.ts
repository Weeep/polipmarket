import { useRouter } from "next/navigation";

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);

  if (res.status === 429) {
    // client-side redirect
    if (typeof window !== "undefined") {
      window.location.href = "/rate-limit-exceeded";
    }

    throw new Error("Rate limit exceeded");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }

  return res;
}
