import { TrackedPage, TrackedPageStatus } from "@prisma/client";

type TrackedPagesAdminPanelProps = {
  pages: TrackedPage[];
  feedbackStatus?: string;
  feedbackMessage?: string;
};

const STATUS_OPTIONS: Array<{ value: TrackedPageStatus; label: string }> = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "PAUSED", label: "PAUSED" },
  { value: "BROKEN", label: "BROKEN" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

function statusTone(status: TrackedPageStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-green-500/40 bg-green-500/10 text-green-300";
    case "PAUSED":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "BROKEN":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    case "ARCHIVED":
      return "border-stone-500/40 bg-stone-500/10 text-stone-300";
    default:
      return "border-stone-500/40 bg-stone-500/10 text-stone-300";
  }
}

function feedbackText(status?: string, message?: string) {
  if (status === "success") {
    return {
      kind: "success" as const,
      text: message ?? "Oldal-regiszter módosítása sikeres.",
    };
  }

  if (status === "error") {
    return {
      kind: "error" as const,
      text: message ?? "Az oldal-regiszter módosítása sikertelen.",
    };
  }

  return null;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Budapest",
  }).format(value);
}

export function TrackedPagesAdminPanel({
  pages,
  feedbackStatus,
  feedbackMessage,
}: TrackedPagesAdminPanelProps) {
  const state = feedbackText(feedbackStatus, feedbackMessage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-100">Politikus oldal-regiszter</h2>
        <p className="mt-1 text-sm text-stone-300">
          Az itt rögzített Facebook-oldalakat fogja a scraper a későbbiekben minden nap
          helyi idő szerint 05:00-kor feldolgozni. Az MVP-ben a rendszer mindig menti a
          kijelzett követőszámot, és exact értéket is, ha elérhető.
        </p>
      </div>

      {state ? (
        <p className={`text-sm ${state.kind === "success" ? "text-green-400" : "text-red-400"}`}>
          {state.text}
        </p>
      ) : null}

      <form action="/api/admin/tracked-pages" method="post" className="grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm text-stone-200">
          Megjelenítési név
          <input
            name="displayName"
            placeholder="pl. Magyar Péter"
            required
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Facebook URL
          <input
            name="sourceUrl"
            type="url"
            placeholder="https://www.facebook.com/..."
            required
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Kanonikus URL
          <input
            name="canonicalUrl"
            type="url"
            placeholder="opcionális"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Országkód
          <input
            name="country"
            maxLength={8}
            placeholder="pl. HU"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm uppercase text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Párt / blokk
          <input
            name="party"
            placeholder="pl. Tisza Párt"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Szerepkör
          <input
            name="role"
            placeholder="pl. pártelnök"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Címkék (vesszővel elválasztva)
          <input
            name="tags"
            placeholder="pl. ellenzék, országos"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Státusz
          <select
            name="status"
            defaultValue="ACTIVE"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Utolsó manuális ellenőrzés
          <input
            type="datetime-local"
            name="lastVerifiedAt"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200 lg:col-span-2">
          Scrape megjegyzés
          <textarea
            name="scrapeNotes"
            rows={3}
            placeholder="Pl. lassan tölt be, vagy csak partial follower adat érkezett."
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-200 lg:col-span-2">
          <input
            type="checkbox"
            name="scrapeEnabled"
            defaultChecked
            className="h-4 w-4 rounded border border-stone-600 bg-stone-800"
          />
          Scrape engedélyezve ennél az oldalnál
        </label>

        <div className="lg:col-span-2">
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-yellow-500/60 bg-yellow-500/90 px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-yellow-400"
          >
            Oldal hozzáadása a regiszterhez
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {[
                "Név",
                "Státusz",
                "Párt",
                "Ország",
                "URL",
                "Címkék",
                "Utolsó manuális ellenőrzés",
                "Scrape",
                "Művelet",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-stone-400">
                  Még nincs felvett politikus oldal a regiszterben.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id}>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-200">
                    <div className="font-medium">{page.displayName}</div>
                    <div className="text-xs text-stone-400">/{page.slug}</div>
                    {page.role ? <div className="mt-1 text-xs text-stone-400">{page.role}</div> : null}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(page.status)}`}>
                      {page.status}
                    </span>
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    {page.party ?? "—"}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    {page.country ?? "—"}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    <a
                      href={page.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-yellow-400 hover:text-yellow-300"
                    >
                      {page.sourceUrl}
                    </a>
                    {page.canonicalUrl ? (
                      <div className="mt-1 break-all text-xs text-stone-400">
                        canonical: {page.canonicalUrl}
                      </div>
                    ) : null}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    {page.tags.length > 0 ? page.tags.join(", ") : "—"}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    {formatDate(page.lastVerifiedAt)}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top text-stone-300">
                    <div>{page.scrapeEnabled ? "engedélyezve" : "tiltva"}</div>
                    <div className="text-xs text-stone-400">login: {page.loginRequired ? "igen" : "nem"}</div>
                    {page.scrapeNotes ? (
                      <div className="mt-1 max-w-xs text-xs text-stone-400">{page.scrapeNotes}</div>
                    ) : null}
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-3 align-top">
                    <form action={`/api/admin/tracked-pages/${page.id}/status`} method="post" className="flex flex-col gap-2">
                      <select
                        name="status"
                        defaultValue={page.status}
                        className="rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-stone-100"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="cursor-pointer rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-xs font-semibold text-stone-100 hover:bg-stone-700"
                      >
                        Státusz mentése
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
