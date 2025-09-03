"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SoccerData = {
  League: string;
  "Home Team": string;
  "Away Team": string;
  [key: string]: string | number;
};

export default function Landing() {
    const params = useParams();
    const router = useRouter();
    const experienceId = params.experienceId as string;
    
    const [data, setData] = useState<SoccerData[]>([]);
    const [horizonData, setHorizonData] = useState<SoccerData[]>([]);
    const [mythosData, setMythosData] = useState<SoccerData[]>([]);

    useEffect(() => {
        fetch('/api/data')
            .then(response => response.json())
            .then(data => {
                console.log("API Response:", data);
                console.log("Debug info:", data.debug);
                console.log("Horizon data length:", data.horizon?.length);
                console.log("First 3 horizon records:", data.horizon?.slice(0, 3));
                setData(data.soccer || []);
                setHorizonData(data.horizon || []);
                setMythosData(data.mythos || []);
            })
            .catch(console.error);
    }, []);

    // Get yesterday's date in MM/DD/YYYY format
    const getYesterdayMMDDYYYY = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    };
    const yesterdayMMDDYYYY = getYesterdayMMDDYYYY();

    // Filter for yesterday's FHG plays (robust date and value matching)
    const yesterdaysFHGPlays = horizonData.filter(row => {
        // Defensive: trim and normalize date and FHG value
        const dateStr = (row.Date || "").toString().trim();
        const fhgStr = (row.FHG || "").toString().trim();
        return dateStr === yesterdayMMDDYYYY && fhgStr.toLowerCase() === "over";
    });
    

    const numPlays = yesterdaysFHGPlays.length;
    const numWins = yesterdaysFHGPlays.filter(row => Number(row["FH Goals"]) >= 1).length;
    const winPct = numPlays > 0 ? ((numWins / numPlays) * 100).toFixed(1) : "0.0";
    
    // FHG Matrix Odds dictionary based on Pregame Goal Line
    const getFHGMatrixOdds = (pregameGoalLine: number): number => {
        if (pregameGoalLine >= 3.25) return 1.44;
        if (pregameGoalLine === 3.0) return 1.5;
        if (pregameGoalLine === 2.75) return 1.5;
        if (pregameGoalLine === 2.5) return 1.55;
        if (pregameGoalLine === 2.25) return 1.65;
        if (pregameGoalLine === 2.0) return 1.7;
        if (pregameGoalLine <= 1.75) return 1.9;
        return 1.7; // Default fallback
    };

    // Calculate profit using dynamic odds based on Pregame Goal Line
    const fhgLosses = numPlays - numWins;
    let fhgTotalProfit = 0;

    horizonData.forEach(row => {
        const dateStr = (row.Date || "").toString().trim();
        if (dateStr !== yesterdayMMDDYYYY) return; // Skip rows not from yesterday

        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        const horizonRow = horizonData.find(horizon => `${horizon.Date}_${horizon["Home Team"]}_${horizon["Away Team"]}` === key);
        const pregameGoalLine = horizonRow ? Number(horizonRow["Pregame Line"] || 2.5) : 2.5;
        const fhgOdds = getFHGMatrixOdds(pregameGoalLine);
        const profitOnWin = fhgOdds - 1;
        const fhGoals = Number(row["FH Goals"]);
        if (fhGoals >= 1) {
            fhgTotalProfit += profitOnWin; // Win
        } else {
            fhgTotalProfit -= 1; // Loss
        }
    });

    const fhgROI = numPlays > 0 ? ((fhgTotalProfit / numPlays)).toFixed(1) : "0.0";

    // Double Chance calculations with filtering rules:
    // - Exclude "Away / Draw" entirely
    // - For "Home / Away", require odds >= 1.2
    // - For "Home / Draw", include all (will swap to Home ML if < 1.18 later)
    const yesterdaysDoubleChancePlays = data.filter(row => {
        const dateStr = (row.Date || "").toString().trim();
        const doubleChance = (row["Double Chance"] || "").toString().trim();
        const odds = Number(row["Double Chance Odds"] || 0);
        
        // Must be yesterday's date with valid Double Chance
        if (dateStr !== yesterdayMMDDYYYY || !doubleChance || doubleChance === "") {
            return false;
        }
        
        // Exclude "Away / Draw" entirely
        if (doubleChance === "Away / Draw") {
            return false;
        }
        
        // For "Home / Away", require odds >= 1.2
        if (doubleChance === "Home / Away" && odds < 1.2) {
            return false;
        }
        
        // For "Home / Draw", include all (we'll handle swapping to Home ML later)
        return true;
    });

    // Create lookup map for mythos data to get final scores
    const mythosLookup = new Map();
    mythosData.forEach(row => {
        const key = `${row.Date}_${row.League}_${row["Home Team"]}`;
        mythosLookup.set(key, row);
    });

    let dcWins = 0;
    let dcTotalProfit = 0;

    yesterdaysDoubleChancePlays.forEach(row => {
        const key = `${row.Date}_${row.League}_${row["Home Team"]}`;
        const mythosRow = mythosLookup.get(key);
        
        if (!mythosRow) return; // Skip if no match found
        
        const homeFT = Number(mythosRow["Home FT Score"] || 0);
        const awayFT = Number(mythosRow["Away FT Score"] || 0);
        const doubleChance = (row["Double Chance"] || "").toString().trim();
        let odds = Number(row["Double Chance Odds"] || 1);
        let betType = doubleChance;
        
        // If Home / Draw with odds < 1.18, swap to Home ML
        if (doubleChance === "Home / Draw" && odds < 1.18) {
            const homeMLOdds = Number(mythosRow["Home ML"] || 0);
            if (homeMLOdds > 0) {
                odds = homeMLOdds;
                betType = "Home ML";
                //console.log(`Swapped to Home ML: odds changed from ${row["Double Chance Odds"]} to ${homeMLOdds}`);
            }
        }
        
        //console.log(`Match: ${row["Home Team"]} vs ${row["Away Team"]}, Original DC: ${doubleChance}, Bet Type: ${betType}, Odds: ${odds}, Scores: ${homeFT}-${awayFT}`);
        
        let isWin = false;
        
        if (betType === "Home ML") {
            isWin = homeFT > awayFT;
        } else if (doubleChance === "Home / Draw") {
            isWin = homeFT >= awayFT;
        } else if (doubleChance === "Home / Away") {
            isWin = homeFT !== awayFT;
        } else if (doubleChance === "Away / Draw") {
            isWin = awayFT >= homeFT;
        }
        
        //console.log(`Result: ${isWin ? 'WIN' : 'LOSS'}`);
        
        if (isWin) {
            dcWins++;
            dcTotalProfit += (odds - 1);
        } else {
            dcTotalProfit -= 1;
        }
    });

    const dcPlays = yesterdaysDoubleChancePlays.length;
    const dcWinPct = dcPlays > 0 ? ((dcWins / dcPlays) * 100).toFixed(1) : "0.0";
    const dcROI = dcPlays > 0 ? ((dcTotalProfit / dcPlays) * 100).toFixed(1) : "0.0";

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
            {/* Header Section */}
            <div className="flex flex-col items-center justify-center pt-16 pb-8">
                <div className="mb-6 p-6 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-2xl">
                    <div className="text-4xl">⚽</div>
                </div>
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-slate-300 bg-clip-text text-transparent">
                    Welcome to Velorium!
                </h1>
                <p className="text-xl text-gray-300 mb-8">Yesterday&apos;s Performance Dashboard</p>
                
                {/* Stats Overview Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-4xl px-6">
                    {/* First Half Goals Card */}
                    <div className="group hover:scale-105 transition-all duration-300">
                        <div className="bg-gradient-to-br from-green-800/80 to-emerald-900/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-green-500/20 hover:border-green-400/40">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-green-100">First Half Goals</h2>
                                <div className="text-3xl bg-green-500/20 p-3 rounded-full">🥅</div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-green-200">Total Plays</span>
                                    <span className="text-2xl font-bold text-white">{numPlays}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-green-200">Wins</span>
                                    <span className="text-2xl font-bold text-green-400">{numWins}</span>
                                </div>
                                
                                <div className="bg-green-900/30 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-green-300">Win Rate</span>
                                        <span className="text-xl font-bold text-green-400">{winPct}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                            style={{width: `${Math.min(parseFloat(winPct), 100)}%`}}
                                        ></div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-green-500/20 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-200">Profit</span>
                                        <span className={`text-xl font-bold ${fhgTotalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {fhgTotalProfit >= 0 ? '+' : ''}{fhgTotalProfit.toFixed(2)}U
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-green-200">ROI</span>
                                        <span className={`text-lg font-semibold ${parseFloat(fhgROI) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {parseFloat(fhgROI) >= 0 ? '+' : ''}{fhgROI}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Double Chance Card */}
                    <div className="group hover:scale-105 transition-all duration-300">
                        <div className="bg-gradient-to-br from-blue-800/80 to-indigo-900/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-blue-500/20 hover:border-blue-400/40">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-blue-100">Double Chance & Moneylines</h2>
                                <div className="text-3xl bg-blue-500/20 p-3 rounded-full">🎯</div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-200">Total Plays</span>
                                    <span className="text-2xl font-bold text-white">{dcPlays}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-200">Wins</span>
                                    <span className="text-2xl font-bold text-blue-400">{dcWins}</span>
                                </div>
                                
                                <div className="bg-blue-900/30 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-blue-300">Win Rate</span>
                                        <span className="text-xl font-bold text-blue-400">{dcWinPct}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                                            style={{width: `${Math.min(parseFloat(dcWinPct), 100)}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <div className="border-t border-blue-500/20 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-200">Profit</span>
                                        <span className={`text-xl font-bold ${dcTotalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {dcTotalProfit >= 0 ? '+' : ''}{dcTotalProfit.toFixed(2)}U
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-blue-200">ROI</span>
                                        <span className={`text-lg font-semibold ${parseFloat(dcROI) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {parseFloat(dcROI) >= 0 ? '+' : ''}{dcROI}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Navigation Button */}
                <div className="mt-12">
                    <button 
                        onClick={() => router.push(`/experience/${experienceId}/dashboard`)}
                        className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-bold text-lg shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
                        <span className="relative z-10">Go to Dashboard</span>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </button>
                </div>
            </div>
        </div>
    );
}

// npm run dev to start
// kill-port 3000 to kill

