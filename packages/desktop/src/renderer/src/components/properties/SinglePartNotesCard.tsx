import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion';
import { Textarea } from '@renderer/components/ui/textarea';

interface SinglePartNotesCardProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function SinglePartNotesCard({ notes, onNotesChange }: SinglePartNotesCardProps) {
  return (
    <Accordion type="single" collapsible className="properties-card p-0 overflow-hidden">
      <AccordionItem value="notes" className="mt-0 border-0 rounded-none">
        <AccordionTrigger>
          Notes
          {notes && <span className="ml-1 text-[9px] text-accent">●</span>}
        </AccordionTrigger>
        <AccordionContent className="px-[14px] pb-[14px]">
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Fabrication notes (edge banding, joinery, etc.)"
            rows={3}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
