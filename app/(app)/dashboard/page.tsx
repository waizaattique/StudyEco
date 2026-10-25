import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuestionsChart from "@/components/dashboard/QuestionsChart";
import RecentChats from "@/components/dashboard/RecentChats";
import Roadmap from "@/components/dashboard/Roadmap";
import TutorActivity from "@/components/dashboard/TutorActivity";
import TutorEntry from "@/components/dashboard/TutorEntry";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <DashboardHeader />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:gap-14">
        <div className="min-w-0 space-y-12">
          <TutorEntry />
          <QuestionsChart />
          <RecentChats />
        </div>

        <aside
          aria-label="Study overview"
          className="space-y-10 border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
        >
          <TutorActivity />
          <Roadmap />
        </aside>
      </div>
    </div>
  );
}
