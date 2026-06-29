import React from 'react';
import { Trophy, Star, TrendingUp, CheckCircle, Calendar } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  name: string;
  photo?: string;
  company: 'SofaShine' | 'CleanCruisers' | 'Both';
  completedJobs: number;
  attendanceRate: number;
  performanceScore: number;
}

interface LeaderboardProps {
  workers: LeaderboardUser[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ workers }) => {
  // Sort by performance score descending
  const sortedWorkers = [...workers].sort((a, b) => b.performanceScore - a.performanceScore);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Performance Leaderboard</h3>
            <p className="text-xs text-slate-400">Top performing workers this month</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedWorkers.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">
            No performance data available.
          </div>
        ) : (
          sortedWorkers.map((worker, index) => {
            const rank = index + 1;
            let rankStyles = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
            if (rank === 1) rankStyles = "bg-amber-500 text-white font-bold";
            if (rank === 2) rankStyles = "bg-slate-300 text-slate-800 font-bold";
            if (rank === 3) rankStyles = "bg-amber-700/80 text-amber-100 font-bold";

            return (
              <div
                key={worker.id}
                className="flex items-center justify-between p-3.5 rounded-custom bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center space-x-4">
                  {/* Rank Indicator */}
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${rankStyles}`}>
                    {rank}
                  </div>

                  {/* Profile Photo */}
                  <img
                    src={worker.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${worker.name}`}
                    alt={worker.name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />

                  {/* Name and Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{worker.name}</h4>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-medium text-secondary">{worker.company}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-0.5 text-success" />
                        {worker.completedJobs} Jobs
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-0.5 text-secondary" />
                        {worker.attendanceRate}% Attd
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center space-x-1.5">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {worker.performanceScore}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
