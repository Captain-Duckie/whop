"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ✅ Move type definition **above** Dashboard()
type SoccerData = {
  League: string;
  "Home Team": string;
  "Away Team": string;
  [key: string]: string | number;
};

export default function Landing() {
    // const [data, setData] = useState<SoccerData[]>([]);
    const [horizonData, setHorizonData] = useState<SoccerData[]>([]);

    useEffect(() => {
        fetch("/api/data")
            .then(response => response.json())
            .then(data => {
                // setData(data.soccer || []);
                setHorizonData(data.horizon || []);
            })
            .catch(console.error);
    }, []);

    // Get yesterday's date in YYYY-MM-DD format
    // const getYesterday = () => {
    //     const d = new Date();
    //     d.setDate(d.getDate() - 1);
    //     return d.toISOString().split("T")[0];
    // };
    // const yesterday = getYesterday();

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

    // Filter for yesterday's FTC plays (robust date and value matching)
    const yesterdaysFTCPlays = horizonData.filter(row => {
        const dateStr = (row.Date || "").toString().trim();
        const ftcStr = (row.FTC || "").toString().trim().toLowerCase();
        return dateStr === yesterdayMMDDYYYY && (ftcStr === "over" || ftcStr === "under");
    });
    const ftcOverPlays = yesterdaysFTCPlays.filter(row => (row.FTC || "").toString().trim().toLowerCase() === "over");
    const ftcUnderPlays = yesterdaysFTCPlays.filter(row => (row.FTC || "").toString().trim().toLowerCase() === "under");
    const overPlays = ftcOverPlays.length;
    const underPlays = ftcUnderPlays.length;

    let overWins = 0, overLosses = 0, overProfit = 0;
    ftcOverPlays.forEach(row => {
        const corners = Number(row["FT Corners"]);
        const line = Number(row["Pregame Corner Line"]);
        const odds = Number(row["Over Corner Odds"]) || 1.9;
        if (corners > line) {
            overWins++;
            overProfit += (odds - 1);
        } else if (corners < line) {
            overLosses++;
            overProfit -= 1;
        }
        // Pushes are dropped from reporting
    });
    // const overWinPct = overPlays > 0 ? ((overWins / overPlays) * 100).toFixed(1) : "0.0";

    let underWins = 0, underLosses = 0, underProfit = 0;
    ftcUnderPlays.forEach(row => {
        const corners = Number(row["FT Corners"]);
        const line = Number(row["Pregame Corner Line"]);
        const odds = Number(row["Under Corner Odds"]) || 1.9;
        if (corners < line) {
            underWins++;
            underProfit += (odds - 1);
        } else if (corners > line) {
            underLosses++;
            underProfit -= 1;
        }
        // Pushes are dropped from reporting
    });
    // const underWinPct = underPlays > 0 ? ((underWins / underPlays) * 100).toFixed(1) : "0.0";

    // Full Time Goals (Asian Totals)
    const yesterdaysFTGPlays = horizonData.filter(row => {
        const dateStr = (row.Date || "").toString().trim();
        const ftgStr = (row.FTG || "").toString().trim().toLowerCase();
        return dateStr === yesterdayMMDDYYYY && (ftgStr === "over" || ftgStr === "under") && row.League !== "Argentine Division 2";
    });
    const ftgOverPlays = yesterdaysFTGPlays.filter(row => (row.FTG || "").toString().trim().toLowerCase() === "over");
    const ftgUnderPlays = yesterdaysFTGPlays.filter(row => (row.FTG || "").toString().trim().toLowerCase() === "under");

    // Asian Total evaluation logic for FTG
    function evaluateAsianResult(direction: "Over" | "Under", ftGoals: number, line: number): "Win" | "Loss" | "Win/Push" | "Loss/Push" | "Push" {
        const mod = line % 1;
        if (mod === 0.25 || mod === 0.75) {
            const lower = line - 0.25;
            const upper = line + 0.25;
            if (direction === "Over") {
                if (ftGoals > upper) return "Win";
                if (ftGoals === upper) return "Win/Push";
                if (ftGoals === lower) return "Loss/Push";
                return "Loss";
            } else {
                if (ftGoals < lower) return "Win";
                if (ftGoals === lower) return "Win/Push";
                if (ftGoals === upper) return "Loss/Push";
                return "Loss";
            }
        } else {
            if (direction === "Over") {
                if (ftGoals > line) return "Win";
                if (ftGoals === line) return "Push";
                return "Loss";
            } else {
                if (ftGoals < line) return "Win";
                if (ftGoals === line) return "Push";
                return "Loss";
            }
        }
    }

    // Over stats (Asian Totals)
    let ftgOverWins = 0, ftgOverLosses = 0, ftgOverWinPush = 0, ftgOverLossPush = 0, ftgOverProfit = 0;
    ftgOverPlays.forEach(row => {
        const ftGoals = Number(row["FT Goals"]);
        const line = Number(row["Pregame Line"]);
        const odds = Number(row["Over Goal Odds"]) || 1.9;
        const result = evaluateAsianResult("Over", ftGoals, line);
        if (result === "Win") {
            ftgOverWins++;
            ftgOverProfit += (odds - 1);
        } else if (result === "Win/Push") {
            ftgOverWinPush++;
            ftgOverProfit += (odds - 1) / 2;
        } else if (result === "Loss/Push") {
            ftgOverLossPush++;
            ftgOverProfit -= 0.5;
        } else if (result === "Loss") {
            ftgOverLosses++;
            ftgOverProfit -= 1;
        }
        // Pushes are dropped from reporting
    });
    const ftgOverCount = ftgOverPlays.length;
    // const ftgOverWinPct = ftgOverCount > 0 ? ((ftgOverWins / ftgOverCount) * 100).toFixed(1) : "0.0";

    // Under stats (Asian Totals)
    let ftgUnderWins = 0, ftgUnderLosses = 0, ftgUnderWinPush = 0, ftgUnderLossPush = 0, ftgUnderProfit = 0;
    ftgUnderPlays.forEach(row => {
        const ftGoals = Number(row["FT Goals"]);
        const line = Number(row["Pregame Line"]);
        const odds = Number(row["Under Goal Odds"]) || 1.9;
        const result = evaluateAsianResult("Under", ftGoals, line);
        if (result === "Win") {
            ftgUnderWins++;
            ftgUnderProfit += (odds - 1);
        } else if (result === "Win/Push") {
            ftgUnderWinPush++;
            ftgUnderProfit += (odds - 1) / 2;
        } else if (result === "Loss/Push") {
            ftgUnderLossPush++;
            ftgUnderProfit -= 0.5;
        } else if (result === "Loss") {
            ftgUnderLosses++;
            ftgUnderProfit -= 1;
        }
        // Pushes are dropped from reporting
    });
    const ftgUnderCount = ftgUnderPlays.length;
    // const ftgUnderWinPct = ftgUnderCount > 0 ? ((ftgUnderWins / ftgUnderCount) * 100).toFixed(1) : "0.0";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-6">Welcome to Stellariea Sports!</h1>
            <p className="mb-8 text-lg">Yesterday&apos;s Results</p>
            <div className="w-full max-w-md mb-8">
                <div className="bg-gray-800 rounded shadow p-6 flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-2">First Half Goals (FHG)</h2>
                    <p className="text-lg">Plays: <span className="font-bold">{numPlays}</span></p>
                    <p className="text-lg">Wins: <span className="font-bold">{numWins}</span></p>
                    <p className="text-lg"><span className="font-bold">{winPct}% Win Rate</span></p>
                </div>
            </div>
            <div className="w-full max-w-md mb-8">
                <div className="bg-gray-800 rounded shadow p-6 flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-4 text-center">Full Time Corners (FTC): <span className="font-bold">{(overProfit + underProfit).toFixed(2)}</span></h2>
                    <div className="w-full flex flex-col gap-4 items-center">
                        <div className="mb-2 text-center">
                            <span className="font-semibold">Overs:</span> {overWins} W / {overLosses} L<br />
                            <span className="font-bold">{overProfit.toFixed(2)}U profit @ {overPlays > 0 ? ((overProfit / overPlays) * 100).toFixed(1) : "0"}% ROI</span>
                        </div>
                        <div className="text-center">
                            <span className="font-semibold">Unders:</span> {underWins} W / {underLosses} L<br />
                            <span className="font-bold">{underProfit.toFixed(2)}U profit @ {underPlays > 0 ? ((underProfit / underPlays) * 100).toFixed(1) : "0"}% ROI</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-md mb-8">
                <div className="bg-gray-800 rounded shadow p-6 flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-4 text-center">Full Time Goals (FTG, Asian Totals): <span className="font-bold">{(ftgOverProfit + ftgUnderProfit).toFixed(2)}</span></h2>
                    <div className="w-full flex flex-col gap-4 items-center">
                        <div className="mb-2 text-center">
                            <span className="font-semibold">Overs:</span> {ftgOverWins} W / {ftgOverWinPush} WP / {ftgOverLossPush} LP / {ftgOverLosses} L<br />
                            <span className="font-bold">{ftgOverProfit.toFixed(2)}U profit @ {ftgOverCount > 0 ? ((ftgOverProfit / ftgOverCount) * 100).toFixed(1) : "0"}% ROI</span>
                        </div>
                        <div className="text-center">
                            <span className="font-semibold">Unders:</span> {ftgUnderWins} W / {ftgUnderWinPush} WP / {ftgUnderLossPush} LP / {ftgUnderLosses} L<br />
                            <span className="font-bold">{ftgUnderProfit.toFixed(2)}U profit @ {ftgUnderCount > 0 ? ((ftgUnderProfit / ftgUnderCount) * 100).toFixed(1) : "0"}% ROI</span>
                        </div>
                    </div>
                </div>
            </div>
            <Link href="{`/experience/${experienceId}/dashboard`}">
              <a className="mt-8 px-6 py-3 bg-blue-600 rounded text-white font-semibold hover:bg-blue-700 transition">
                Go to Dashboard
              </a>
            </Link>
        </div>
    );
}
