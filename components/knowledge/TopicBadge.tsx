import type { Topic } from "@/lib/types";

interface Props {
  topic: Topic;
}

function scoreColor(score: number): {
  bg: string;
  text: string;
  dot: string;
  label: string;
} {
  if (score >= 70)
    return {
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
      label: "Dominando",
    };
  if (score >= 40)
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      dot: "bg-yellow-500",
      label: "Em progresso",
    };
  return {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Iniciando",
  };
}

export function TopicBadge({ topic }: Props) {
  const { bg, text, dot } = scoreColor(topic.score);

  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${bg} transition-all duration-300`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span
          className={`text-sm font-medium truncate ${text}`}
          title={topic.name}
        >
          {topic.name}
        </span>
      </div>
      <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${text}`}>
        {topic.score}
      </span>
    </div>
  );
}
