import { TopPage } from "@/components/top/TopPage";
import { fetchBosaiStaticSnapshot } from "@/lib/fetch-bosai-static-snapshot";

export default async function Home() {
  const initialSnapshot = await fetchBosaiStaticSnapshot();
  return <TopPage initialSnapshot={initialSnapshot} />;
}
