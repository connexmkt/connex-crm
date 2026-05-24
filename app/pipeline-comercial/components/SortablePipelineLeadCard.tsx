import { useSortable } from "@dnd-kit/sortable";
import { PipelineLeadCard } from "./PipelineLeadCard";
import { CSS } from "@dnd-kit/utilities";
import type { PipelineLead } from "@/lib/types";

export function SortablePipelineLeadCard({
  lead,
  onClick,
}: {
  lead: PipelineLead;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PipelineLeadCard lead={lead} onClick={onClick} />
    </div>
  );
}
