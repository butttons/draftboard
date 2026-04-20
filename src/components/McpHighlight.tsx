import { cn } from "#/lib/utils";
import { useMcpTarget } from "#/hooks/useMcpTarget";

type McpHighlightProps = {
	target: string;
	children: React.ReactNode;
	className?: string;
};

export function McpHighlight({
	target,
	children,
	className,
}: McpHighlightProps) {
	const { isActive, label, screenName } = useMcpTarget(target);

	if (!isActive) return <>{children}</>;

	return (
		<div
			className={cn(
				"relative rounded-lg ring-2 ring-offset-1 ring-blue-400 transition-all duration-150",
				className,
			)}
		>
			{children}
			{/* Tooltip */}
			<div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
				<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium whitespace-nowrap shadow-lg">
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
					</span>
					<span>{label}</span>
					{screenName && (
						<span className="text-[10px] opacity-70 font-mono">
							{screenName}
						</span>
					)}
				</div>
				<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45" />
			</div>
		</div>
	);
}
