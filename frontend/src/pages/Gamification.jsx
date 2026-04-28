import React, { useEffect, useState, useRef } from 'react';
import { getGamificationProfile, getLeaderboard, getBadges, getWeeklyChallenge } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate } from '../utils/formatters.js';

// -------------------------------------------------------
// Animated counter hook
// -------------------------------------------------------

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(step);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

// -------------------------------------------------------
// Error boundary — shows error instead of white screen
// -------------------------------------------------------

class GamificationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--danger)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Achievements failed to render</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// -------------------------------------------------------
// Avatar circle with deterministic colour
// -------------------------------------------------------

function AvatarCircle({ name }) {
  const safeName = (name && typeof name === 'string') ? name : 'Unknown';
  const initials = safeName.trim()
    ? safeName.trim().split(/\s+/).map((p) => p[0] || '').join('').toUpperCase().slice(0, 2) || '?'
    : '?';
  const colours = [
    '#2563eb', '#7c3aed', '#db2777', '#059669',
    '#d97706', '#dc2626', '#0891b2', '#65a30d',
  ];
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  const colour = colours[Math.abs(hash) % colours.length];

  return (
    <div className="avatar-circle" style={{ background: colour }}>
      {initials}
    </div>
  );
}

// -------------------------------------------------------
// Rank medal
// -------------------------------------------------------

function RankMedal({ rank }) {
  if (rank === 1) return <span className="rank-medal">🥇</span>;
  if (rank === 2) return <span className="rank-medal">🥈</span>;
  if (rank === 3) return <span className="rank-medal">🥉</span>;
  return <span style={{ fontWeight: 600 }}>#{rank}</span>;
}

// -------------------------------------------------------
// Level progress bar component
// -------------------------------------------------------

function LevelProgressCard({ level }) {
  if (!level) return null;

  const pct = Math.min(Math.max(level.progress_pct ?? 0, 0), 100);
  const xpIn = level.xp_in_level ?? 0;
  const xpNeeded = level.xp_needed ?? 1;
  const xpAway = xpNeeded - xpIn;

  return (
    <div className="card mb-6">
      <div className="card-header">
        <span className="card-title">
          {level.icon} Level Progress
        </span>
        <span className="badge badge-warning" style={{ fontSize: '13px' }}>
          {level.icon} {level.name}
        </span>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
          <span>{xpIn.toLocaleString()} XP earned</span>
          <span style={{ color: 'var(--text-muted)' }}>{xpNeeded.toLocaleString()} XP to next level</span>
        </div>
        <div className="level-progress-track">
          <div
            className="level-progress-bar"
            style={{ '--pct': `${pct}%` }}
          />
        </div>
        <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {xpAway > 0
            ? `${xpAway.toLocaleString()} XP away from next level`
            : 'Max level reached!'}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Weekly challenge card
// -------------------------------------------------------

function WeeklyChallengeCard({ challenge }) {
  if (!challenge) return null;

  const pct = challenge.target > 0
    ? Math.min((challenge.progress / challenge.target) * 100, 100)
    : 0;

  const expiresDate = challenge.expires ? formatDate(challenge.expires) : null;

  return (
    <div className="card weekly-challenge-card mb-6">
      <div className="card-header">
        <span className="card-title">
          {challenge.icon || '🎯'} Weekly Challenge
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {challenge.completed ? (
            <span className="badge badge-success">COMPLETED</span>
          ) : (
            <span className="badge badge-warning">+{challenge.reward_points ?? 50} pts</span>
          )}
          {expiresDate && (
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Expires {expiresDate}
            </span>
          )}
        </div>
      </div>
      <div className="card-body">
        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>
          {challenge.title}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {challenge.description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
          <span>{challenge.progress} / {challenge.target} shifts completed</span>
          <span style={{ color: 'var(--primary)' }}>{Math.round(pct)}%</span>
        </div>
        <div className="level-progress-track">
          <div
            className="level-progress-bar"
            style={{
              '--pct': `${pct}%`,
              background: challenge.completed
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--primary), #7c3aed)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Points history
// -------------------------------------------------------

function PointsHistory({ transactions }) {
  if (!transactions || transactions.length === 0) return null;

  const last10 = transactions.slice(0, 10);

  // Group by date
  const groups = [];
  let lastDate = null;
  last10.forEach((tx) => {
    const d = tx.created_at ? formatDate(tx.created_at) : 'Unknown';
    if (d !== lastDate) {
      groups.push({ date: d, items: [] });
      lastDate = d;
    }
    groups[groups.length - 1].items.push(tx);
  });

  const iconForReason = (reason = '') => {
    const r = reason.toLowerCase();
    if (r.includes('check') || r.includes('shift')) return '⏱️';
    if (r.includes('badge') || r.includes('achiev')) return '🏅';
    if (r.includes('streak')) return '🔥';
    if (r.includes('bonus')) return '🎁';
    return '⭐';
  };

  return (
    <div className="card mb-6">
      <div className="card-header">
        <span className="card-title">Points History</span>
        <span className="badge badge-neutral">{last10.length} recent</span>
      </div>
      <div className="card-body" style={{ padding: '0' }}>
        {groups.map((group) => (
          <div key={group.date}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
              padding: '10px 20px 6px',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}>
              {group.date}
            </div>
            {group.items.map((tx, i) => (
              <div key={i} className="points-history-item">
                <span className="points-history-icon">{iconForReason(tx.reason)}</span>
                <span className="points-history-reason">{tx.reason || 'Points earned'}</span>
                <span className="points-history-pts">+{(tx.points ?? 0).toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------

export default function Gamification() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getGamificationProfile().catch(() => null),
      getLeaderboard().catch(() => null),
      getBadges().catch(() => null),
      getWeeklyChallenge().catch(() => null),
    ])
      .then(([profileData, leaderboardData, badgesData, challengeData]) => {
        if (profileData) {
          setProfile(profileData.profile || profileData);
        }
        if (leaderboardData) {
          setLeaderboard(
            Array.isArray(leaderboardData)
              ? leaderboardData
              : leaderboardData.leaderboard || []
          );
        }
        if (badgesData) {
          const badges = badgesData.badges || badgesData;
          if (Array.isArray(badges) && badges.length > 0) {
            setAllBadges(badges);
          }
        }
        if (challengeData) {
          setChallenge(challengeData.challenge || challengeData);
        }
      })
      .catch((err) => {
        toast.error('Failed to load achievements: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animated counter targets (only animate once profile loads)
  const totalPoints = profile?.total_points ?? profile?.points ?? 0;
  const currentStreak = profile?.streak?.current_streak ?? 0;

  const animatedPoints = useCountUp(totalPoints, 1200);
  const animatedStreak = useCountUp(currentStreak, 800);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  // Derived values
  const level = profile?.level ?? null;
  const myEntry = leaderboard.find(
    (e) => e.user_id === user?.id || e.username === user?.username
  );
  const myRank = myEntry?.rank ?? myEntry?.position ?? (leaderboard.indexOf(myEntry) + 1 || null);

  // Badge earned count using the `earned` field directly from API
  const earnedCount = allBadges.filter((b) => b.earned).length;

  return (
    <GamificationErrorBoundary>
    <div>
      {/* ===================================================
          Section 1 — Hero Stats Bar
          =================================================== */}
      <div className="gami-hero mb-6">
        <div className="gami-hero-card">
          <div className="gami-hero-icon">⭐</div>
          <div className="gami-hero-value">{animatedPoints.toLocaleString()}</div>
          <div className="gami-hero-label">Total Points</div>
        </div>

        <div className="gami-hero-divider" />

        <div className="gami-hero-card">
          <div className="gami-hero-icon">{level?.icon || '🎖️'}</div>
          <div className="gami-hero-value">{level?.name || 'Beginner'}</div>
          <div className="gami-hero-label">Current Level</div>
        </div>

        <div className="gami-hero-divider" />

        <div className="gami-hero-card">
          <div className="gami-hero-icon">🔥</div>
          <div className="gami-hero-value">{animatedStreak}</div>
          <div className="gami-hero-label">Day Streak</div>
        </div>

        <div className="gami-hero-divider" />

        <div className="gami-hero-card">
          <div className="gami-hero-icon">🏅</div>
          <div className="gami-hero-value">{myRank ? `#${myRank}` : '-'}</div>
          <div className="gami-hero-label">Leaderboard Rank</div>
        </div>
      </div>

      {/* ===================================================
          Section 2 — Level Progress
          =================================================== */}
      <LevelProgressCard level={level} />

      {/* ===================================================
          Section 3 — Weekly Challenge
          =================================================== */}
      <WeeklyChallengeCard challenge={challenge} />

      {/* ===================================================
          Section 4 — Achievements / Badges
          =================================================== */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">
            Achievements
            <span className="badge badge-neutral" style={{ marginLeft: '10px' }}>
              {earnedCount} / {allBadges.length} earned
            </span>
          </span>
        </div>
        <div className="card-body">
          {allBadges.length === 0 ? (
            <div className="empty-state">
              <p>No badges available yet. Start earning points to unlock achievements!</p>
            </div>
          ) : (
            <div className="badges-grid-4">
              {allBadges.map((badge) => {
                const isEarned = badge.earned === true;
                const earnedAt = badge.earned_at;
                const showProgress = !isEarned && badge.criteria_type === 'completed_shifts' && badge.criteria_value;

                return (
                  <div
                    key={badge.id}
                    className={`badge-card ${isEarned ? 'earned' : 'locked'}`}
                    title={badge.description}
                  >
                    <div className="badge-card-icon" style={{ position: 'relative', display: 'inline-block' }}>
                      {badge.icon || badge.emoji || '🏅'}
                    </div>
                    <div className="badge-card-name">{badge.name}</div>
                    <div className="badge-card-desc">{badge.description}</div>
                    {isEarned && earnedAt && (
                      <div className="badge-card-date">
                        Earned {formatDate(earnedAt)}
                      </div>
                    )}
                    {isEarned && !earnedAt && (
                      <div className="badge-card-date">Earned</div>
                    )}
                    {showProgress && (
                      <div className="badge-card-progress">
                        Complete {badge.criteria_value} shifts
                      </div>
                    )}
                    {!isEarned && !showProgress && badge.criteria_type && (
                      <div className="badge-card-progress">
                        {badge.criteria_value ? `Target: ${badge.criteria_value}` : badge.criteria_type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          Section 5 — Points History
          =================================================== */}
      <PointsHistory transactions={profile?.recent_transactions} />

      {/* ===================================================
          Section 6 — Leaderboard
          =================================================== */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Leaderboard — Top 10</span>
          <span>🏆</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <p>No leaderboard data yet. Start earning points by checking in!</p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Points</th>
                  <th>Badges</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 10).map((entry, idx) => {
                  const rank = entry.rank ?? entry.position ?? idx + 1;
                  const isMe =
                    entry.user_id === user?.id ||
                    entry.username === user?.username;
                  const name = entry.full_name || entry.user_name || entry.username || 'Unknown';
                  const streak = entry.current_streak ?? entry.streak ?? 0;

                  return (
                    <tr
                      key={entry.user_id || idx}
                      className={[
                        'leaderboard-row',
                        rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '',
                        isMe ? 'current-user' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <td style={{ width: '60px' }}>
                        <RankMedal rank={rank} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarCircle name={name} />
                          <span style={{ fontWeight: isMe ? 700 : 500 }}>
                            {name}
                            {isMe && (
                              <span className="badge badge-info" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                You
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>
                          {(entry.total_points ?? entry.points ?? 0).toLocaleString()}
                        </strong>
                      </td>
                      <td>{entry.badge_count ?? entry.badges_count ?? 0}</td>
                      <td>
                        {streak > 0 ? `${streak} 🔥` : streak}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </GamificationErrorBoundary>
  );
}
