import DebugPanel from "./DebugPanel";

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Debug</h1>
      <p>Authエミュ＆Firestoreのスモークテスト</p>
      <DebugPanel />
    </main>
  );
}
