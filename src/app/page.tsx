import { TopPage } from "@/components/top/TopPage";
import {
  assertBosaiStaticSnapshotDeployable,
  fetchBosaiStaticSnapshot,
} from "@/lib/fetch-bosai-static-snapshot";

export default async function Home() {
  const initialSnapshot = await fetchBosaiStaticSnapshot();
  // GeonicDB 全滅時に空スナップショットで前回公開を上書きしない（N-10）
  assertBosaiStaticSnapshotDeployable(initialSnapshot);
  return <TopPage initialSnapshot={initialSnapshot} />;
}
