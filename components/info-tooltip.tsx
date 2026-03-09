import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  label: string
  explanation: string
  className?: string
}

export default function InfoTooltip({ label, explanation, className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "underline decoration-dotted underline-offset-4 cursor-help",
            className
          )}>
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-xs text-sm"
        >
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
