import Link from "next/link";

type LegalAcceptanceNoticeProps = {
  triggerText: string;
  className?: string;
};

export function LegalAcceptanceNotice({
  triggerText,
  className,
}: LegalAcceptanceNoticeProps) {
  return (
    <p className={className}>
      * A {triggerText} elfogadod az{" "}
      <span className="inline">
        <Link
          href="/assets/aszf.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-300 underline hover:text-amber-200"
        >
          Általános Szerződési Feltételeket
        </Link>{" "}
        és az{" "}
        <Link
          href="/assets/adatkezelesi_tajekoztato.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-300 underline hover:text-amber-200"
        >
          Adatkezelési Tájékoztatót
        </Link>
        .
      </span>
    </p>
  );
}
