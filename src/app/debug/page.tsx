import { notFound } from "next/navigation";
import DebugPanel from "./DebugPanel";

export default function Page() {
  // エミュレータ向けのスモークテスト用。本番ビルドでは公開しない
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main style={{ padding: 24 }}>
      <h1>Debug</h1>
      <p>Authエミュ＆Firestoreのスモークテスト</p>
      <DebugPanel />
    </main>
  );
}
