import type { Topic } from "@/lib/types";
import { TopicBadge } from "./TopicBadge";

interface Props {
  topics: Topic[];
}

export function KnowledgeMap({ topics }: Props) {
  const sorted = [...topics].sort((a, b) => b.score - a.score);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <h2 className="text-sm font-semibold text-gray-900">
          Mapa de Conhecimento
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {topics.length === 0
            ? "Seus tópicos aparecerão aqui"
            : `${topics.length} ${topics.length === 1 ? "tópico" : "tópicos"}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Converse com o Theo para começar a mapear seu conhecimento
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((topic) => (
              <TopicBadge key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>

      {topics.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              ≥70
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
              40–69
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              &lt;40
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
