// src/app/(nolayout)/admin/page.tsx
import { ImpersonateButton } from "@/components/ImpersonateButton";
import { LegalDocumentsAdminForm } from "@/components/LegalDocumentsAdminForm";
import { MarketAdminPanel } from "@/components/MarketAdminPanel";
import { StopImpersonationButton } from "@/components/StopImpersonationButton";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { listPublicAssetPdfFileNames } from "@/modules/legal/application/publicLegalAssets";
import { listUsers } from "@/modules/user/application/listUsers";
import Link from "next/link";

export default async function AdminPage() {
  await ensureAdmin();
  const [users, availableDocuments] = await Promise.all([
    listUsers(),
    listPublicAssetPdfFileNames(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-semibold text-stone-100">Admin</h1>

      <section className="overflow-hidden rounded-xl border border-stone-700/70 bg-stone-900/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <MarketAdminPanel />
      </section>

      <form
        action="/api/admin/create-user"
        method="post"
        className="rounded-xl border border-stone-700/70 bg-stone-900/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      >
        <h2 className="mb-3 text-xl font-semibold text-stone-100">Create fake user</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="email"
            placeholder="email"
            required
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
          <input
            name="name"
            placeholder="name"
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-yellow-500/60 bg-yellow-500/90 px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-yellow-400"
          >
            Create
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-stone-700/70 bg-stone-900/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <h2 className="mb-3 text-xl font-semibold text-stone-100">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">
                  id
                </th>
                <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">
                  email
                </th>
                <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">
                  name
                </th>
                <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">
                  role
                </th>
                <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{u.id}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{u.email}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{u.name}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{u.role}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2">
                    <ImpersonateButton userId={u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <StopImpersonationButton />
        </div>
      </section>

      <section className="rounded-xl border border-stone-700/70 bg-stone-900/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <LegalDocumentsAdminForm availableDocuments={availableDocuments} />
      </section>

      <p className="text-sm text-stone-300">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300">
          Back
        </Link>
      </p>
    </div>
  );
}
