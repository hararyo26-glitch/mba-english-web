import { fetchEpisodeListAction, fetchReviewQueueAction } from "@/lib/actions/dictation-actions";
import { DictationClient } from "./DictationClient";

export const dynamic = "force-dynamic";

export default async function DictationPage() {
  const [episodes, reviewItems] = await Promise.all([
    fetchEpisodeListAction(),
    fetchReviewQueueAction(),
  ]);

  return <DictationClient initialEpisodes={episodes} initialReviewItems={reviewItems} />;
}
