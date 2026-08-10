import TetrisLoading from "@/components/ui/tetris-loader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <TetrisLoading size="sm" speed="fast" loadingText="Loading..." />
    </div>
  );
}
