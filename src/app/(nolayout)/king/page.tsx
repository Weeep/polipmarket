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
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>

      <form
        action="/api/admin/create-user"
        method="post"
        style={{ marginBottom: 24 }}
      >
        <h2>Create fake user</h2>
        <input name="email" placeholder="email" required />
        <input name="name" placeholder="name" />
        <button type="submit">Create</button>
      </form>

      <h2>Users</h2>
      <table border={1} cellPadding={8}>
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

      <LegalDocumentsAdminForm availableDocuments={availableDocuments} />

      <MarketAdminPanel />

      <p style={{ marginTop: 24 }}>
        <Link href="/">Back</Link>
      </p>
    </div>
  );
}
