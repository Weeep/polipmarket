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
    <div className="admin-page">
      <h1>Admin</h1>

      <form
        action="/api/admin/create-user"
        method="post"
        className="admin-card"
      >
        <h2>Create fake user</h2>
        <div className="admin-form-row">
          <input name="email" placeholder="email" required />
          <input name="name" placeholder="name" />
          <button type="submit">Create</button>
        </div>
      </form>

      <section className="admin-card">
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>email</th>
              <th>name</th>
              <th>role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>
                  <ImpersonateButton userId={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <StopImpersonationButton />
      </section>

      <section className="admin-card">
        <LegalDocumentsAdminForm availableDocuments={availableDocuments} />
      </section>

      <section className="admin-card admin-card--wide">
        <MarketAdminPanel />
      </section>

      <p className="admin-back-link">
        <Link href="/">Back</Link>
      </p>
    </div>
  );
}
