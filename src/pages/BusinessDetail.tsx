import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  isMarketOpen, formatCurrencyMc, mcToRands, randsToMc, TRANCHE_CONFIGS,
  calculateConfidenceScore, calculateConfidencePrice,
  seedCandleHistory,
} from '@/lib/calculations';
import { CandlestickChart } from '@/components/CandlestickChart';
import { ConfidenceLineChart } from '@/components/ConfidenceLineChart';
import type { Candle, Loan, TrancheId } from '@/types';

// Map business names to their header images
const BUSINESS_HEADER_IMAGES: Record<string, string> = {
  'Campus Eats': '/CampusEats.jpg',
  'NotesXchange': '/NotesXchange.jpg',
  'Res Laundry Loop': '/ResLaundryLoop.jpg',
};

function getBusinessHeaderImage(businessName: string): string {
  return BUSINESS_HEADER_IMAGES[businessName] || '/default-business.jpg';
}

export function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { businesses, investments, reviews, currentUser, confidenceHistory, loans, addInvestment, addTrade, addReview, addNotification, updateUserBalance, updateBusiness, addConfidencePoint, backBusiness, hasBacked, addLoan } = useStore();

  const business = businesses.find((b) => b.id === id);
  const bizReviews = reviews.filter((r) => r.businessId === id);
  const bizConfidence = confidenceHistory[id || ''] || [];
  const marketOpen = isMarketOpen();

  const [selectedTranche, setSelectedTranche] = useState<TrancheId>('origin');
  // Single unit per transaction - user must buy one at a time
  const buyUnits = 1;
  const [reviewRating, setReviewRating] = useState(8);
  const [reviewComment, setReviewComment] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanSubmitted, setLoanSubmitted] = useState(false);
  const [candles, setCandles] = useState<Candle[]>(business ? seedCandleHistory(mcToRands(business.confidencePrice)) : []);

  if (!business) return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center text-[var(--app-fg-muted)]">Business not found</div>;

  const tc = TRANCHE_CONFIGS[selectedTranche];
  const totalCost = (tc.minDeposit + tc.buyFee) * buyUnits;
  const userUnits = currentUser ? investments.filter((i) => i.userId === currentUser.id && i.businessId === business.id && i.trancheId === selectedTranche).reduce((s, i) => s + i.units, 0) : 0;
  const canReview = userUnits > 0;

  // Backing (crowdfunding) — ventures open for backing hide buy/sell trading controls
  const tradingVisible = business.status !== 'approved' && business.status !== 'draft';
  const backed = currentUser ? hasBacked(business.id, currentUser.id) : false;
  const backerPct = business.requiredBackers > 0 ? Math.min(100, Math.round((business.currentBackers / business.requiredBackers) * 100)) : 0;

  // Owner Launch Capital loan application
  const isOwner = !!currentUser && currentUser.id === business.ownerId;
  const loanEligible = isOwner && (business.status === 'approved' || business.status === 'live');
  const existingLoan = loans.find((l) => l.businessId === business.id && (l.status === 'draft' || l.status === 'active'));
  const loanAmountRands = Number(loanAmount);
  const loanAmountValid = loanAmount.trim() !== '' && Number.isFinite(loanAmountRands) && loanAmountRands > 0 && loanAmountRands <= 50000;

  const statusBadge = (() => {
    switch (business.status) {
      case 'draft': return { text: 'Awaiting banker review', cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' };
      case 'approved': return { text: `Funding — ${business.currentBackers}/${business.requiredBackers} backers`, cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
      case 'live': return { text: 'LIVE', cls: 'bg-green-500/10 border-green-500/20 text-green-400' };
      case 'rejected': return { text: 'Rejected', cls: 'bg-red-500/10 border-red-500/20 text-red-400' };
      default: return { text: business.status, cls: 'bg-gray-500/10 border-gray-500/20 text-gray-400' };
    }
  })();

  const handleBack = () => {
    if (!currentUser) return;
    backBusiness(business.id, currentUser.id);
  };

  const handleLoanApply = () => {
    if (!currentUser || !loanAmountValid) return;
    const amountMc = randsToMc(loanAmountRands);
    const adminFeeEnv = parseInt(import.meta.env.VITE_LOAN_ADMIN_FEE ?? '', 10);
    const now = new Date().toISOString();
    const loan: Loan = {
      id: `l-${Date.now()}`,
      businessId: business.id,
      businessName: business.name,
      borrowerId: currentUser.id,
      borrowerName: currentUser.fullName,
      amountMillicents: amountMc,
      interestMillicents: Math.round(amountMc * 0.02),
      adminFeeMillicents: Number.isFinite(adminFeeEnv) ? adminFeeEnv : 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'draft',
      createdAt: now,
      repaidAt: null,
      tier: 1,
      totalRepaidMillicents: 0,
      lastRepaymentDate: null,
      repaymentCount: 0,
      extensionStatus: 'none',
      extensionRequestedAt: null,
      extensionInterestMillicents: 0,
      loanCategoryUnlocked: 1,
      requiredBackers: business.requiredBackers,
      currentBackers: business.currentBackers,
      proofOfPaymentUrl: null,
      businessDescription: business.businessDescription,
      targetMarket: business.targetMarket,
      needsTimeExtension: false,
    };
    addLoan(loan);
    setLoanSubmitted(true);
    setLoanAmount('');
    setLoanPurpose('');
  };

  const handleBuy = () => {
    if (!currentUser) return;
    if (!marketOpen) { alert('Market is closed. Trading hours: Mon-Fri 15:00-23:50 SAST'); return; }
    if (currentUser.walletBalanceMillicents < totalCost) { alert('Insufficient balance'); return; }

    addInvestment({
      id: `i-${Date.now()}`, userId: currentUser.id, userName: currentUser.fullName,
      businessId: business.id, businessName: business.name, trancheId: selectedTranche,
      units: buyUnits, depositedMillicents: tc.minDeposit * buyUnits, status: 'active',
      createdAt: new Date().toISOString(),
    });
    addTrade({
      id: `t-${Date.now()}`, businessId: business.id, businessName: business.name,
      buyerId: currentUser.id, sellerId: null, trancheId: selectedTranche,
      units: buyUnits, pricePerUnitMillicents: tc.minDeposit, tradeType: 'buy', isVaultIntervention: false,
      createdAt: new Date().toISOString(),
    });
    updateUserBalance(currentUser.id, -totalCost);
    updateBusiness(business.id, {
      totalUnitsIssued: business.totalUnitsIssued + buyUnits,
      netEntries: business.netEntries + buyUnits,
      currentBets: business.currentBets + tc.minDeposit * buyUnits,
      confidencePrice: calculateConfidencePrice(business.netEntries + buyUnits),
    });
    addNotification({
      id: `n-${Date.now()}`, userId: currentUser.id, type: 'investment_bought',
      message: `You bought ${buyUnits} ${tc.name} unit(s) in ${business.name} for ${formatCurrencyMc(totalCost)}.`,
      read: false, createdAt: new Date().toISOString(),
    });
  };

  const handleSell = () => {
    if (!currentUser || !marketOpen || userUnits <= 0) return;
    const sellUnits = Math.min(userUnits, buyUnits);
    const refund = tc.minDeposit * sellUnits;
    const fee = tc.sellFee * sellUnits;
    const netRefund = refund - fee;

    updateUserBalance(currentUser.id, netRefund);
    updateBusiness(business.id, {
      netEntries: business.netEntries - sellUnits,
      currentBets: Math.max(0, business.currentBets - refund),
      confidencePrice: calculateConfidencePrice(business.netEntries - sellUnits),
    });
    addTrade({
      id: `t-${Date.now()}`, businessId: business.id, businessName: business.name,
      buyerId: null, sellerId: currentUser.id, trancheId: selectedTranche,
      units: sellUnits, pricePerUnitMillicents: tc.minDeposit, tradeType: 'sell', isVaultIntervention: false,
      createdAt: new Date().toISOString(),
    });
    addNotification({
      id: `n-${Date.now()}`, userId: currentUser.id, type: 'investment_sold',
      message: `You sold ${sellUnits} ${tc.name} unit(s) in ${business.name}. Received ${formatCurrencyMc(netRefund)} (fee: ${formatCurrencyMc(fee)}).`,
      read: false, createdAt: new Date().toISOString(),
    });
  };

  const handleReview = () => {
    if (!currentUser || !canReview) return;
    // Prevent duplicate reviews
    const existingReview = reviews.find((r) => r.userId === currentUser.id && r.businessId === business.id);
    if (existingReview) { alert('You have already reviewed this business.'); return; }
    addReview({
      id: `r-${Date.now()}`, userId: currentUser.id, userName: currentUser.fullName,
      businessId: business.id, businessName: business.name,
      rating: reviewRating, comment: reviewComment,
      createdAt: new Date().toISOString(),
    });
    setReviewComment('');
  };

  const handlePayment = () => {
    if (!currentUser || !paymentAmount || Number(paymentAmount) <= 0) return;
    const amt = Math.round(Number(paymentAmount) * 1000);
    if (currentUser.walletBalanceMillicents < amt) { alert('Insufficient balance'); return; }
    updateUserBalance(currentUser.id, -amt);
    addNotification({
      id: `n-${Date.now()}`, userId: business.ownerId, type: 'payment_received',
      message: `${currentUser.fullName} paid ${formatCurrencyMc(amt)} to ${business.name}.`,
      read: false, createdAt: new Date().toISOString(),
    });
    setPaymentAmount('');
  };

  const handleConfidenceVote = (vote: number) => {
    if (!id) return;
    const latest = bizConfidence[bizConfidence.length - 1];
    const newScore = calculateConfidenceScore([vote], latest ? [latest.businessSelfReport] : [7]);
    addConfidencePoint(id, {
      timestamp: Date.now(), investorVote: vote,
      businessSelfReport: latest?.businessSelfReport || 7,
      compositeScore: newScore, voteCount: (latest?.voteCount || 0) + 1,
    });
  };

  const headerImage = getBusinessHeaderImage(business.name);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      {/* Header with business-specific background */}
      <div
        className="relative border-b border-[var(--card-border)]"
        style={{
          backgroundImage: headerImage ? `url(${headerImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--app-bg)]/70 via-[var(--app-bg)]/85 to-[var(--app-bg)]" />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/market')} className="p-2 rounded-lg border border-[var(--card-border-hover)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all backdrop-blur-sm bg-black/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: business.color, boxShadow: `0 0 12px ${business.color}50` }} />
                <div>
                  <h1 className="text-xl font-bold">{business.name}</h1>
                  <p className="text-[10px] text-[var(--app-fg-muted)]">Owner: {business.ownerName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-sm bg-black/20 ${statusBadge.cls}`}>
                {statusBadge.text}
              </div>
              {business.status === 'live' && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-sm bg-black/20 ${marketOpen ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {marketOpen ? 'Market Open' : 'Market Closed'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-6">
            {/* Back this venture (approved = open for backing) */}
            {business.status === 'approved' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--app-fg)]">Back this venture</h3>
                  <span className="text-[10px] font-bold text-amber-400">{business.currentBackers}/{business.requiredBackers} backers</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--card-bg-elevated)] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${backerPct}%` }} />
                </div>
                <p className="text-[11px] text-[var(--app-fg-muted)]">
                  When {business.requiredBackers} backers pledge, this venture goes live for trading.
                </p>
                {backed ? (
                  <button disabled
                    className="w-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2.5 rounded-lg cursor-default">
                    You backed this venture ✓
                  </button>
                ) : (
                  <button onClick={handleBack} disabled={!currentUser}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold py-2.5 rounded-lg transition-all">
                    Back this business
                  </button>
                )}
              </div>
            )}

            {/* Draft notice */}
            {business.status === 'draft' && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                <p className="text-xs text-yellow-400">This venture is awaiting banker review. Backing and trading open once it is approved.</p>
              </div>
            )}

            {/* Candle Chart (trading only — hidden while funding/draft) */}
            {tradingVisible && (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] h-[320px] sm:h-[400px] lg:h-[450px] overflow-hidden">
              <CandlestickChart
                candles={candles.length > 0 ? candles : seedCandleHistory(mcToRands(business.confidencePrice))}
                basePrice={mcToRands(business.confidencePrice)}
                buyVolume={business.totalUnitsIssued}
                sellVolume={Math.abs(Math.min(0, business.netEntries))}
                confidenceScore={bizConfidence.length > 0 ? bizConfidence[bizConfidence.length - 1].compositeScore : 50}
                isLive={business.isLive && marketOpen}
                businessName={business.name}
                trancheName={tc.financialTerm}
                color={business.color}
                onBuy={() => handleBuy()}
                onSell={() => handleSell()}
                onCandleUpdate={(updated) => setCandles(updated)}
              />
            </div>
            )}

            {/* Confidence Chart */}
            {bizConfidence.length > 0 && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] h-[220px] lg:h-[280px] overflow-hidden">
                <ConfidenceLineChart data={bizConfidence} businessColor={business.color} />
              </div>
            )}

            {/* Reviews */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
                Reviews ({bizReviews.length})
              </h3>

              {/* Review Form */}
              {canReview && (
                <div className="mb-4 p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                  <p className="text-[10px] text-[var(--app-fg-muted)] mb-2">Rate this business (1-10)</p>
                  <input type="range" min="1" max="10" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer mb-2"
                    style={{ background: `linear-gradient(to right, ${business.color} ${reviewRating * 10}%, rgba(255,255,255,0.08) ${reviewRating * 10}%)` }} />
                  <div className="flex items-center justify-between text-[10px] text-[var(--app-fg-subtle)] mb-2">
                    <span>1</span><span className="text-[var(--app-fg-dim)] font-bold">{reviewRating}/10</span><span>10</span>
                  </div>
                  <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-3 py-2 text-xs text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50 resize-none mb-2"
                    rows={2} placeholder="Share your experience..." />
                  <button onClick={handleReview} disabled={!reviewComment.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[var(--card-bg-elevated)] hover:bg-[var(--input-bg)] text-xs text-[var(--app-fg)] disabled:opacity-30 transition-all">Submit Review</button>
                </div>
              )}
              {!canReview && currentUser && (
                <p className="text-[10px] text-[var(--app-fg-subtle)] mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  You must own at least one SeedUnit in this business to leave a review.
                </p>
              )}

              {/* Review List */}
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {bizReviews.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--app-fg)]">{r.userName}</span>
                      <span className="text-xs font-bold" style={{ color: r.rating >= 7 ? '#22c55e' : r.rating >= 5 ? '#f59e0b' : '#ef4444' }}>{r.rating}/10</span>
                    </div>
                    <p className="text-[11px] text-[var(--app-fg-dim)]">{r.comment}</p>
                  </div>
                ))}
                {bizReviews.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-4">No reviews yet</p>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Owner: Apply for Launch Capital */}
            {loanEligible && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
                <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider">Apply for Launch Capital</h3>
                {existingLoan ? (
                  <div className="space-y-2">
                    {loanSubmitted && (
                      <p className="text-[11px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                        Application submitted — the banker will review it.
                      </p>
                    )}
                    {existingLoan.status === 'draft' ? (
                      <p className="text-[11px] text-yellow-400 bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                        Loan application under review
                      </p>
                    ) : (
                      <p className="text-[11px] text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                        Active loan — balance {formatCurrencyMc(existingLoan.amountMillicents + existingLoan.interestMillicents + existingLoan.adminFeeMillicents - existingLoan.totalRepaidMillicents)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-[var(--app-fg-muted)] block mb-1">Amount (ZAR, max R50,000)</label>
                      <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)}
                        className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="5000.00" />
                      {loanAmount.trim() !== '' && !loanAmountValid && (
                        <p className="text-[10px] text-red-400 mt-1">Enter an amount greater than R0 and up to R50,000.</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--app-fg-muted)] block mb-1">Purpose</label>
                      <textarea value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-3 py-2 text-xs text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50 resize-none"
                        rows={3} placeholder="What will you use the capital for?" />
                    </div>
                    <button onClick={handleLoanApply} disabled={!loanAmountValid}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold py-2.5 rounded-lg transition-all">
                      Submit Application
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Business Stats */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider">Business Metrics</h3>
              {[
                { label: 'Confidence Price', value: `R${mcToRands(business.confidencePrice).toFixed(2)}`, color: business.color },
                { label: 'Health Score', value: business.healthScore.toString(), color: business.healthScore >= 80 ? '#22c55e' : business.healthScore >= 60 ? '#f59e0b' : '#ef4444' },
                { label: 'Total Units', value: business.totalUnitsIssued.toString(), color: '#fff' },
                { label: 'Net Entries', value: (business.netEntries >= 0 ? '+' : '') + business.netEntries, color: business.netEntries >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Current Bets', value: formatCurrencyMc(business.currentBets), color: '#f59e0b' },
                { label: 'Settled Bets', value: formatCurrencyMc(business.settledBets), color: '#22c55e' },
                { label: 'Net Profit', value: formatCurrencyMc(business.netProfit), color: business.netProfit >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Profit Margin', value: `${business.profitMargin.toFixed(1)}%`, color: business.profitMargin >= 0 ? '#22c55e' : '#ef4444' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--app-fg-muted)]">{s.label}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Invest Panel (trading only — hidden while funding/draft) */}
            {tradingVisible && (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider">Invest Panel</h3>

              {/* Tranche Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {(['origin', 'velocity', 'apex'] as const).map((tid) => (
                  <button key={tid} onClick={() => setSelectedTranche(tid)}
                    className={`p-2 rounded-lg border text-center transition-all ${selectedTranche === tid ? 'border-[var(--card-border-hover)] bg-[var(--card-bg-hover)]' : 'border-transparent hover:border-[var(--card-border)]'}`}>
                    <div className="text-[9px] font-bold" style={{ color: TRANCHE_CONFIGS[tid].color }}>{TRANCHE_CONFIGS[tid].name.split(' ')[0]}</div>
                    <div className="text-[9px] text-[var(--app-fg-subtle)]">R{mcToRands(TRANCHE_CONFIGS[tid].minDeposit)}</div>
                  </button>
                ))}
              </div>

              {/* Single Unit Display */}
              <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                <span className="text-[10px] text-blue-400">1 unit per transaction. Complete this purchase to buy another.</span>
              </div>

              {/* Cost Breakdown */}
              <div className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-fg-muted)]">Deposit</span><span className="text-[var(--app-fg-dim)] font-mono">{formatCurrencyMc(tc.minDeposit * buyUnits)}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-fg-muted)]">Buy Fee</span><span className="text-[var(--app-fg-dim)] font-mono">{formatCurrencyMc(tc.buyFee * buyUnits)}</span></div>
                <div className="h-px bg-[var(--card-bg-elevated)]" />
                <div className="flex justify-between text-xs font-bold"><span className="text-[var(--app-fg)]">Total</span><span className="font-mono" style={{ color: tc.color }}>{formatCurrencyMc(totalCost)}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-fg-subtle)]">Potential Profit</span><span className="text-green-400 font-mono">+{formatCurrencyMc(tc.profitPerUnit * buyUnits)}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-fg-subtle)]">Potential Loss</span><span className="text-red-400 font-mono">-{formatCurrencyMc(tc.lossPerUnit * buyUnits)}</span></div>
              </div>

              {userUnits > 0 && (
                <div className="text-[10px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  You own {userUnits} unit(s) in this tranche
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleBuy} disabled={!marketOpen || !currentUser}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-30 text-[var(--app-fg)] text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5m-7 7h14"/></svg>
                  BUY
                </button>
                <button onClick={handleSell} disabled={!marketOpen || userUnits <= 0}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-[var(--app-fg)] text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/></svg>
                  SELL
                </button>
              </div>

              {!marketOpen && (
                <p className="text-[10px] text-red-400/60 text-center">Trading is closed. Market hours: Weekdays 15:00-23:50, Weekends 12:00-23:50 SAST</p>
              )}
            </div>
            )}

            {/* Pay Business */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider">Pay This Business</h3>
              <div>
                <label className="text-[10px] text-[var(--app-fg-muted)] block mb-1">Amount (ZAR)</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="100.00" />
              </div>
              <button onClick={handlePayment} disabled={!paymentAmount || Number(paymentAmount) <= 0 || !currentUser}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-[var(--app-fg)] text-xs font-bold py-2.5 rounded-lg transition-all">
                Pay Now (Free)
              </button>
            </div>

            {/* Confidence Vote */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider mb-2">Confidence Vote</h3>
              <p className="text-[10px] text-[var(--app-fg-subtle)] mb-3">Will this debtor pay? (1-10)</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                  <button key={v} onClick={() => handleConfidenceVote(v)}
                    className={`py-1.5 rounded text-[10px] font-bold transition-all ${v <= 3 ? 'hover:bg-red-500/20 text-red-400' : v <= 6 ? 'hover:bg-yellow-500/20 text-yellow-400' : 'hover:bg-green-500/20 text-green-400'} bg-[var(--card-bg-elevated)]`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
