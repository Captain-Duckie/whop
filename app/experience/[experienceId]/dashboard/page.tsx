"use client";

import { useEffect, useState } from "react";

// ✅ Move type definition **above** Dashboard()
type SoccerData = {
  League: string;
  "Home Team": string;
  "Away Team": string;
  [key: string]: string | number;
};

// Type for FHG signals
type FHGSignals = {
  SN: boolean;
  M: boolean;
  Nebula: boolean;
};

// Type for matrix bucket
type MatrixBucket = {
  label: string;
  filter: (signals: FHGSignals) => boolean;
};

export default function SearchResults() {
    const [data, setData] = useState<SoccerData[]>([]); 
    const [selectedLeague, setSelectedLeague] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [teamFilterType, setTeamFilterType] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [horizonData, setHorizonData] = useState<SoccerData[]>([]);
    const [mythosData, setMythosData] = useState<SoccerData[]>([]);

    const clearFilters = () => {
        setSelectedLeague(""); // Reset league selection 
        setSelectedTeam(""); // Reset selected teams
        setTeamFilterType("All"); // Reset team filter type
        setStartDate("");
        setEndDate("");
    };


    useEffect(() => {
        fetch("/api/data")
            .then(response => response.json())
            .then(data => {
                setData(data.soccer || []);
                setHorizonData(data.horizon || []);
                setMythosData(data.mythos || []);
            })
            .catch(console.error);

        fetch("/api/whop")
            .then(response => response.json())
            .then(data => console.log("Whop User Data:", data))
            .catch(console.error);
    }, []);
    useEffect(() => {
        if (selectedLeague) {
            setSelectedTeam(""); // Reset teams when league changes
        }
    }, [selectedLeague]);

      // Function to filter by team selection
    const filterByTeam = (data: SoccerData[]) => {
        if (!selectedTeam) return data;

        return data.filter((row) => {
        if (teamFilterType === "Home") return row["Home Team"] === selectedTeam;
        if (teamFilterType === "Away") return row["Away Team"] === selectedTeam;
        if (teamFilterType === "All")
            return row["Home Team"] === selectedTeam || row["Away Team"] === selectedTeam;
        return true;
        });
    };
    const filterByDateRange = (data: SoccerData[]) => {
        if (!startDate && !endDate) return data;

        return data.filter((row) => {
        const rowDate = new Date(row.Date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (!start || rowDate >= start) && (!end || rowDate <= end);
        });
    };


    // Apply filters before calculating stats
    const filteredData = filterByDateRange(filterByTeam(
    selectedLeague ? data.filter((row) => row.League === selectedLeague) : data
    ));
    const teamsForLeague = selectedLeague
        ? data.filter((row) => row.League === selectedLeague)
        : data;
    const uniqueTeams = [
        ...new Set(teamsForLeague.flatMap((row) => [row["Home Team"], row["Away Team"]]))
        ].filter(Boolean) // remove null/undefined
        .sort((a, b) => a.localeCompare(b)); // sort alphabetically



    const calculateFHStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over");
        const wins = playData.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = playData.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum =
        playData.length > 0 ? parseFloat(((wins / playData.length) * 100).toFixed(2)) : 0;

        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
    };

    const calculateFHSharedStats = () => {
        const sharedData = filteredData.filter(
        (row) => row["M FHG"] === "Over" && row["SN FHG"] === "Over"
        );
        const wins = sharedData.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = sharedData.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum =
        sharedData.length > 0 ? parseFloat(((wins / sharedData.length) * 100).toFixed(2)) : 0;

        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
    };
  /// FT Goal Stats
    const calculateFTGoalStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over" || row[playType] === "Under");

        const overPlays = playData.filter((row) => row[playType] === "Over");
        const underPlays = playData.filter((row) => row[playType] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };
    const calculateCombinedFTGoalStats = () => {
        const playData = filteredData.filter(
            (row) => (row["M FTG"] === "Over" && row["SN FTG"] === "Over") || 
                    (row["M FTG"] === "Under" && row["SN FTG"] === "Under")
        );

        const overPlays = playData.filter((row) => row["M FTG"] === "Over" && row["SN FTG"] === "Over");
        const underPlays = playData.filter((row) => row["M FTG"] === "Under" && row["SN FTG"] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Goals"]) <= Number(row["Pregame Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Goals"]) >= Number(row["Pregame Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };

    const calculateFTCStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over" || row[playType] === "Under");

        const overPlays = playData.filter((row) => row[playType] === "Over");
        const underPlays = playData.filter((row) => row[playType] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };
    const calculateCombinedFTCStats = () => {
        const playData = filteredData.filter(
            (row) => (row["M FTC"] === "Over" && row["SN FTC"] === "Over") || 
                    (row["M FTC"] === "Under" && row["SN FTC"] === "Under")
        );

        const overPlays = playData.filter((row) => row["M FTC"] === "Over" && row["SN FTC"] === "Over");
        const underPlays = playData.filter((row) => row["M FTC"] === "Under" && row["SN FTC"] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Corners"]) <= Number(row["Pregame Corner Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Corners"]) >= Number(row["Pregame Corner Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };

    // const sharedFTGoalStats = calculateCombinedFTGoalStats();
    // const fullTimeGoalStatsMythos = calculateFTGoalStats("M FTG");
    // const fullTimeGoalStatsSuperNova = calculateFTGoalStats("SN FTG");

    // const sharedFTCStats = calculateCombinedFTCStats();
    // const fullTimeCornerStatsMythos = calculateFTCStats("M FTC");
    // const fullTimeCornerStatsSuperNova = calculateFTCStats("SN FTC");

    // const supernovaStats = calculateFHStats("SN FHG");
    // const mythosStats = calculateFHStats("M FHG");
    // const sharedStats = calculateFHSharedStats();
    // const nebulaStats = calculateFHStats("Nebula");


    // --- FHG Correlation Matrix Logic ---
    // Helper to check bot signals
    const getFHGSignals = (row: SoccerData): FHGSignals => ({
        SN: row["SN FHG"] === "Over",
        M: row["M FHG"] === "Over",
        Nebula: row["Nebula"] === "Over",
    });
    // Matrix buckets
    const matrixBuckets: MatrixBucket[] = [
        {
            label: "SuperNova Only",
            filter: (s: FHGSignals) => s.SN && !s.M && !s.Nebula,
        },
        {
            label: "Mythos Only",
            filter: (s: FHGSignals) => !s.SN && s.M && !s.Nebula,
        },
        {
            label: "Nebula Only",
            filter: (s: FHGSignals) => !s.SN && !s.M && s.Nebula,
        },
        {
            label: "SuperNova & Mythos",
            filter: (s: FHGSignals) => s.SN && s.M && !s.Nebula,
        },
        {
            label: "SuperNova & Nebula",
            filter: (s: FHGSignals) => s.SN && !s.M && s.Nebula,
        },
        {
            label: "Mythos & Nebula",
            filter: (s: FHGSignals) => !s.SN && s.M && s.Nebula,
        },
        {
            label: "All Three Agree",
            filter: (s: FHGSignals) => s.SN && s.M && s.Nebula,
        },
        {
            label: "None (Disagree)",
            filter: (s: FHGSignals) => !s.SN && !s.M && !s.Nebula,
        },
    ];
    // Calculate stats for each bucket
    const fhgMatrixStats = matrixBuckets.map((bucket) => {
        const plays = filteredData.filter((row) => bucket.filter(getFHGSignals(row)));
        const wins = plays.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = plays.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentage = plays.length > 0 ? ((wins / plays.length) * 100).toFixed(2) : "N/A";
        return {
            label: bucket.label,
            plays: plays.length,
            wins,
            losses,
            winPercentage,
        };
    });

    // --- Correlation Matrix for First Half Goals ---
const calculateFHGCorrelations = () => {
    // Each row: which bots pinged "Over" for FHG
    type ComboKey = string;
    type ComboStats = { label: string; count: number; wins: number; losses: number; winRate: string };
    const combos: Record<ComboKey, ComboStats> = {};
    filteredData.forEach((row) => {
        const bots: string[] = [];
        if (row["SN FHG"] === "Over") bots.push("SuperNova");
        if (row["M FHG"] === "Over") bots.push("Mythos");
        if (row["Nebula"] === "Over") bots.push("Nebula");
        // Key: sorted bot names joined by "+" (e.g. "SuperNova+Mythos")
        const key = bots.sort().join("+");
        if (!combos[key]) {
            combos[key] = {
                label: bots.length ? bots.join(" + ") : "None",
                count: 0,
                wins: 0,
                losses: 0,
                winRate: "N/A",
            };
        }
        combos[key].count++;
        if (bots.length && Number(row["FH Goals"]) >= 1) {
            combos[key].wins++;
        } else if (bots.length) {
            combos[key].losses++;
        }
    });
    // Calculate win rates
    Object.values(combos).forEach((combo) => {
        const total = combo.wins + combo.losses;
        combo.winRate = total > 0 ? `${((combo.wins / total) * 100).toFixed(2)}%` : "N/A";
    });
    // Sort by most bots, then count desc
    return Object.values(combos).sort((a, b) => b.label.split(" + ").length - a.label.split(" + ").length || b.count - a.count);
};
const fhgCorrelations = calculateFHGCorrelations();

// --- Mythos Dataset FHG % Card ---
useEffect(() => {
    fetch("/api/data")
        .then(response => response.json())
        .then(data => {
            setMythosData(data.mythos || []);
            // Removed console.log for Mythos Dataset
        })
        .catch(console.error);
}, []);

// Filtering for Mythos Dataset
const mythosFiltered = mythosData.filter((row) => {
    let match = true;
    // Defensive: some rows may have undefined or differently cased keys
    if (selectedLeague) match = match && String(row.League).trim() === String(selectedLeague).trim();
    if (selectedTeam) {
        if (teamFilterType === "Home") match = match && String(row["Home Team"]).trim() === String(selectedTeam).trim();
        else if (teamFilterType === "Away") match = match && String(row["Away Team"]).trim() === String(selectedTeam).trim();
        else match = match && (String(row["Home Team"]).trim() === String(selectedTeam).trim() || String(row["Away Team"]).trim() === String(selectedTeam).trim());
    }
    if (startDate && row.Date) match = match && new Date(row.Date) >= new Date(startDate);
    if (endDate && row.Date) match = match && new Date(row.Date) <= new Date(endDate);
    return match;
});

// Calculate FHG % for Mythos Dataset
const mythosFHGPlays = mythosFiltered.length;
const mythosFHGWins = mythosFiltered.filter(row => {
    const homeHT = Number(row["Home HT Score"]);
    const awayHT = Number(row["Away HT Score"]);
    return (homeHT + awayHT) >= 1;
}).length;
const mythosFHGPercent = mythosFHGPlays > 0 ? ((mythosFHGWins / mythosFHGPlays) * 100).toFixed(2) : "N/A";

// Filtering for Horizon Dataset
const horizonFiltered = horizonData.filter((row) => {
    let match = true;
    if (selectedLeague) match = match && String(row.League).trim() === String(selectedLeague).trim();
    if (selectedTeam) {
        if (teamFilterType === "Home") match = match && String(row["Home Team"]).trim() === String(selectedTeam).trim();
        else if (teamFilterType === "Away") match = match && String(row["Away Team"]).trim() === String(selectedTeam).trim();
        else match = match && (String(row["Home Team"]).trim() === String(selectedTeam).trim() || String(row["Away Team"]).trim() === String(selectedTeam).trim());
    }
    if (startDate && row.Date) match = match && new Date(row.Date) >= new Date(startDate);
    if (endDate && row.Date) match = match && new Date(row.Date) <= new Date(endDate);
    return match;
});
// Horizon FHG Stats - Only include games where FTG = "Over"
const horizonFHGFiltered = horizonFiltered.filter(row => row["FHG"] === "Over");
const horizonFHGPlays = horizonFHGFiltered.length;
const horizonFHGWins = horizonFHGFiltered.filter(row => Number(row["FH Goals"] || 0) >= 1).length;
const horizonFHGPercent = horizonFHGPlays > 0 ? ((horizonFHGWins / horizonFHGPlays) * 100).toFixed(2) : "N/A";
// Horizon FTG Stats - Only include games with Over/Under in FTG column and exclude 'Argentine Division 2'
const horizonFTGFiltered = horizonFiltered.filter(row => (row["FTG"] === "Over" || row["FTG"] === "Under") && row.League !== "Argentine Division 2");
const horizonFTGPlays = horizonFTGFiltered.length;
const horizonFTGWins = horizonFTGFiltered.filter(row => Number(row["FT Goals"] || 0) > Number(row["Pregame Line"] || 0)).length;
const horizonFTGPercent = horizonFTGPlays > 0 ? ((horizonFTGWins / horizonFTGPlays) * 100).toFixed(2) : "N/A";
// Only include games with FTC = "Over" or "Under" for FTC stats
const horizonFTCFiltered = horizonFiltered.filter(row => row["FTC"] === "Over" || row["FTC"] === "Under");
const horizonFTCPlays = horizonFTCFiltered.length;
const horizonFTCWins = horizonFTCFiltered.filter(row => Number(row["FT Corners"] || 0) > Number(row["Pregame Corner Line"] || 0)).length;
const horizonFTCPercent = horizonFTCPlays > 0 ? ((horizonFTCWins / horizonFTCPlays) * 100).toFixed(2) : "N/A";

// Asian Total evaluation logic for FTG (filtered)
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
// Horizon FTG Asian Result Stats (only games with Over/Under FTG)
const horizonFTGOverResults = { Win: 0, "Win/Push": 0, Push: 0, "Loss/Push": 0, Loss: 0 };
const horizonFTGUnderResults = { Win: 0, "Win/Push": 0, Push: 0, "Loss/Push": 0, Loss: 0 };
horizonFTGFiltered.forEach(row => {
    const ftGoals = Number(row["FT Goals"] || 0);
    const line = Number(row["Pregame Line"] || 0);
    // Over bet only if row["FTG"] === "Over"
    if (row["FTG"] === "Over") {
        const overResult = evaluateAsianResult("Over", ftGoals, line);
        horizonFTGOverResults[overResult]++;
    }
    // Under bet only if row["FTG"] === "Under"
    if (row["FTG"] === "Under") {
        const underResult = evaluateAsianResult("Under", ftGoals, line);
        horizonFTGUnderResults[underResult]++;
    }
});

// --- Profit Calculation for Horizon FTG (Asian Totals) ---
function calculateHorizonFTGProfit() {
    let overProfit = 0;
    let underProfit = 0;
    let debugCount = 0;
    
    horizonFTGFiltered.forEach(row => {
        const ftGoals = Number(row["FT Goals"] || 0);
        const line = Number(row["Pregame Line"] || 0);
        if (row["FTG"] === "Over") {
            const odds = Number(row["Over Goal Odds"] || 1.9);
            const result = evaluateAsianResult("Over", ftGoals, line);
            if (debugCount < 5) {
                console.log(`Over - Goals: ${ftGoals}, Line: ${line}, Odds: ${odds}, Result: ${result}`);
                debugCount++;
            }
            if (result === "Win") overProfit += (odds - 1);
            else if (result === "Win/Push") overProfit += (odds - 1) / 2;
            else if (result === "Push") overProfit += 0;
            else if (result === "Loss/Push") overProfit -= 0.5;
            else if (result === "Loss") overProfit -= 1;
        }
        if (row["FTG"] === "Under") {
            const odds = Number(row["Under Goal Odds"] || 1.9);
            const result = evaluateAsianResult("Under", ftGoals, line);
            if (debugCount < 10) {
                console.log(`Under - Goals: ${ftGoals}, Line: ${line}, Odds: ${odds}, Result: ${result}`);
                debugCount++;
            }
            if (result === "Win") underProfit += (odds - 1);
            else if (result === "Win/Push") underProfit += (odds - 1) / 2;
            else if (result === "Push") underProfit += 0;
            else if (result === "Loss/Push") underProfit -= 0.5;
            else if (result === "Loss") underProfit -= 1;
        }
    });
    
    console.log(`Total Under Profit before rounding: ${underProfit}`);
    console.log(`Total Over Profit before rounding: ${overProfit}`);
    
    return {
        overProfit: overProfit.toFixed(2),
        underProfit: underProfit.toFixed(2)
    };
}
const horizonFTGProfits = calculateHorizonFTGProfit();

// --- Profit Calculation for Horizon FTC ---
function calculateHorizonFTCProfit() {
    let overProfit = 0;
    let underProfit = 0;
    horizonFTCFiltered.forEach(row => {
        const ftCorners = Number(row["FT Corners"] || 0);
        const line = Number(row["Pregame Corner Line"] || 0);
        if (row["FTC"] === "Over") {
            const odds = Number(row["Over Corner Odds"] || 0);
            if (ftCorners > line) overProfit += (odds - 1);
            else if (ftCorners < line) overProfit -= 1;
            else overProfit += 0; // Push
        }
        if (row["FTC"] === "Under") {
            const odds = Number(row["Under Corner Odds"] || 0);
            if (ftCorners < line) underProfit += (odds - 1);
            else if (ftCorners > line) underProfit -= 1;
            else underProfit += 0; // Push
        }
    });
    return {
        overProfit: overProfit.toFixed(2),
        underProfit: underProfit.toFixed(2)
    };
}
const horizonFTCProfits = calculateHorizonFTCProfit();

// --- FHG Correlation Matrix for Goals Before 30th Minute (using Mythos Dataset) ---
const calculateFHGBefore30Matrix = () => {
    // Create a key-based lookup for Mythos data
    const mythosLookup = new Map();
    mythosData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        mythosLookup.set(key, row);
    });

    // Matrix buckets for before 30 analysis
    const matrixBuckets = [
        {
            label: "SuperNova Only",
            filter: (s: any) => s.SN && !s.M && !s.Nebula,
        },
        {
            label: "Mythos Only",
            filter: (s: any) => !s.SN && s.M && !s.Nebula,
        },
        {
            label: "Nebula Only",
            filter: (s: any) => !s.SN && !s.M && s.Nebula,
        },
        {
            label: "SuperNova & Mythos",
            filter: (s: any) => s.SN && s.M && !s.Nebula,
        },
        {
            label: "SuperNova & Nebula",
            filter: (s: any) => s.SN && !s.M && s.Nebula,
        },
        {
            label: "Mythos & Nebula",
            filter: (s: any) => !s.SN && s.M && s.Nebula,
        },
        {
            label: "All Three Agree",
            filter: (s: any) => s.SN && s.M && s.Nebula,
        },
        {
            label: "None (Disagree)",
            filter: (s: any) => !s.SN && !s.M && !s.Nebula,
        },
    ];

    // Calculate stats for each bucket
    return matrixBuckets.map((bucket) => {
        const plays = filteredData.filter((row) => bucket.filter(getFHGSignals(row)));
        let wins = 0;
        let losses = 0;
        let disregarded = 0;

        plays.forEach(row => {
            const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
            const mythosRow = mythosLookup.get(key);
            
            if (!mythosRow) {
                disregarded++;
                return;
            }

            const firstGoalTime = mythosRow["First Goal Time"];
            const homeHT = Number(mythosRow["Home HT Score"] || 0);
            const awayHT = Number(mythosRow["Away HT Score"] || 0);
            
            // Disregard conditions
            if (firstGoalTime === -1 || firstGoalTime === "-") {
                disregarded++;
                return;
            }
            
            // If no first goal time but HT score >= 1, disregard
            if ((firstGoalTime === "" || firstGoalTime == null) && (homeHT + awayHT) >= 1) {
                disregarded++;
                return;
            }

            // Win conditions: First Goal Time 0-31
            if (firstGoalTime >= 0 && firstGoalTime <= 31) {
                wins++;
            }
            // Loss conditions: HT Score = 0 OR First Goal Time > 31
            else if ((homeHT + awayHT) === 0 || firstGoalTime > 31) {
                losses++;
            } else {
                disregarded++;
            }
        });

        const totalValidPlays = wins + losses;
        const winPercentage = totalValidPlays > 0 ? ((wins / totalValidPlays) * 100).toFixed(2) : "N/A";
        
        return {
            label: bucket.label,
            plays: plays.length,
            validPlays: totalValidPlays,
            wins,
            losses,
            disregarded,
            winPercentage,
        };
    });
};

const fhgBefore30MatrixStats = calculateFHGBefore30Matrix();

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-white flex flex-col items-center">
        <div className="w-full max-w-6xl relative mb-4">
            <h1 className="text-2xl font-bold text-center">Mythos Soccer Dashboard</h1>
            <button
                onClick={() => window.location.href = '/'}
                className="absolute top-0 right-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
                Back to Home
            </button>
        </div>
        {/* League Filter Dropdown */}
        <select
            className="mb-4 p-2 border bg-gray-800 text-white"
            onChange={(e) => setSelectedLeague(e.target.value)}
            value={selectedLeague}
        >
            <option value="">All Leagues</option>
            {data.length > 0 &&
            [...new Set(data.map((row) => row.League))].map((league) => (
                <option key={league} value={league}>
                {league}
                </option>
            ))}
        </select>
        <select
            className="mb-4 p-2 border bg-gray-800 text-white"
            onChange={(e) => setSelectedTeam(e.target.value)}
            value={selectedTeam}
        >
            <option value="">All Teams</option>
            {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                {team}
                </option>
            ))}
        </select>
        {/* Team Filter Type Dropdown */}
        <select
            className="mb-4 p-2 border bg-gray-800 text-white"
            onChange={(e) => setTeamFilterType(e.target.value)}
            value={teamFilterType}
        >
            <option value="All">All Games</option>
            <option value="Home">Home Team</option>
            <option value="Away">Away Team</option>
        </select>
        {/* Date Filter Boxes */}
        <div className="flex gap-4 mb-4">
          <input
              type="date"
              className="p-2 border bg-gray-800 text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
          />
          <input
              type="date"
              className="p-2 border bg-gray-800 text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button 
            onClick={clearFilters} 
            className="mb-4 p-2 border bg-red-600 text-white rounded hover:bg-red-700"
        >
            Clear Filters
        </button>

<h2 className="text-2xl font-bold mt-6 mb-2">Horizon Results</h2>
        {/* Horizon Dataset FHG/FTG/FTC Cards - 3x1 row, Asian logic for FTG */}
        <div className="w-full flex flex-row gap-6 justify-center mb-6">
          {/* FHG Card */}
          <div className="p-6 bg-gray-800 rounded shadow flex flex-col items-center max-w-xs w-full">
            <h2 className="text-lg font-bold mb-2">Horizon FHG %</h2>
            <p className="text-base">Games: {horizonFHGPlays}</p>
            <p className="text-base">{horizonFHGWins} W / {horizonFHGPlays - horizonFHGWins} L</p>
            <p className="text-base font-bold">{horizonFHGPercent}% Win Rate</p>
          </div>
          {/* FTG Card (Asian Totals) */}
          <div className="p-6 bg-gray-800 rounded shadow flex flex-col items-center max-w-xs w-full">
            <h2 className="text-lg font-bold mb-2">Horizon FTG (Asian Total)</h2>
            <p className="text-base">Games: {horizonFTGPlays}</p>
            <div className="w-full">
              <h3 className="text-base font-semibold mt-2 mb-1">Over:</h3>
              <p className="text-sm">{horizonFTGOverResults.Win} W / {horizonFTGOverResults["Win/Push"]} WP / {horizonFTGOverResults["Loss/Push"]} LP / {horizonFTGOverResults.Loss} L</p>
              <p className="text-sm font-bold">{horizonFTGProfits.overProfit}U profit @ {(() => {
                const overPlays = horizonFTGOverResults.Win + horizonFTGOverResults["Win/Push"] + horizonFTGOverResults.Push + horizonFTGOverResults["Loss/Push"] + horizonFTGOverResults.Loss;
                const roi = overPlays > 0 ? ((Number(horizonFTGProfits.overProfit) / overPlays) * 100).toFixed(1) : "0";
                return roi;
              })()}% ROI</p>
              <h3 className="text-base font-semibold mt-2 mb-1">Under:</h3>
              <p className="text-sm">{horizonFTGUnderResults.Win} W / {horizonFTGUnderResults["Win/Push"]} WP / {horizonFTGUnderResults["Loss/Push"]} LP / {horizonFTGUnderResults.Loss} L</p>
              <p className="text-sm font-bold">{horizonFTGProfits.underProfit}U profit @ {(() => {
                const underPlays = horizonFTGUnderResults.Win + horizonFTGUnderResults["Win/Push"] + horizonFTGUnderResults.Push + horizonFTGUnderResults["Loss/Push"] + horizonFTGUnderResults.Loss;
                const roi = underPlays > 0 ? ((Number(horizonFTGProfits.underProfit) / underPlays) * 100).toFixed(1) : "0";
                return roi;
              })()}% ROI</p>
            </div>
          </div>
          {/* FTC Card - Over/Under breakdown */}
          <div className="p-6 bg-gray-800 rounded shadow flex flex-col items-center max-w-xs w-full">
            <h2 className="text-lg font-bold mb-2">Horizon FTC</h2>
            <p className="text-base">Games: {horizonFTCPlays}</p>
            {/* Over/Under breakdown */}
            <div className="w-full">
              <h3 className="text-base font-semibold mt-2 mb-1">Over:</h3>
              <p className="text-sm">{horizonFTCFiltered.filter(r => r["FTC"] === "Over" && Number(r["FT Corners"] || 0) > Number(r["Pregame Corner Line"] || 0)).length} W / {horizonFTCFiltered.filter(r => r["FTC"] === "Over" && Number(r["FT Corners"] || 0) < Number(r["Pregame Corner Line"] || 0)).length} L</p>
              <p className="text-sm font-bold">{horizonFTCProfits.overProfit}U profit @ {(() => {
                const overPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Over");
                const roi = overPlays.length > 0 ? ((Number(horizonFTCProfits.overProfit) / overPlays.length) * 100).toFixed(1) : "0";
                return roi;
              })()}% ROI</p>
              <h3 className="text-base font-semibold mt-2 mb-1">Under:</h3>
              <p className="text-sm">{horizonFTCFiltered.filter(r => r["FTC"] === "Under" && Number(r["FT Corners"] || 0) < Number(r["Pregame Corner Line"] || 0)).length} W / {horizonFTCFiltered.filter(r => r["FTC"] === "Under" && Number(r["FT Corners"] || 0) > Number(r["Pregame Corner Line"] || 0)).length} L</p>
              <p className="text-sm font-bold">{horizonFTCProfits.underProfit}U profit @ {(() => {
                const underPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Under");
                const roi = underPlays.length > 0 ? ((Number(horizonFTCProfits.underProfit) / underPlays.length) * 100).toFixed(1) : "0";
                return roi;
              })()}% ROI</p>
            </div>
          </div>
        </div>
        {/* Summary Statistic Cards */}
        {/* First Half Goals Correlation Matrix - Card Format */}
<h2 className="text-2xl font-bold mt-6 mb-2">First Half Goals Correlation Matrix (Cards)</h2>
<p className="text-gray-300 text-center mb-4 max-w-4xl">
  This matrix analyzes different combinations of bot signals for first half goals and their corresponding win rates. 
  Each combination shows how often at least one goal is scored in the first half when specific bots predict "Over" for FHG. 
  Results help identify which bot combinations are most reliable for first half goal predictions.
</p>
<div className="flex flex-col items-center w-full mb-6">
  {/* Top: All Three Agree */}
  {fhgMatrixStats.filter(c => c.label === "All Three Agree").map((combo) => (
    <div key={combo.label} className="p-6 mb-4 bg-gray-800 rounded shadow flex flex-col items-center w-full max-w-md">
      <h3 className="text-xl font-bold mb-2">{combo.label}</h3>
      <p className="text-base">Games: {combo.plays}</p>
      <p className="text-base">Wins: {combo.wins}</p>
      <p className="text-base">Losses: {combo.losses}</p>
      <p className="text-base font-bold">{combo.winPercentage}% Win Rate</p>
    </div>
  ))}
  {/* Second row: 2-bot combos */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-4 justify-center">
    {fhgMatrixStats.filter(c => ["SuperNova & Mythos", "SuperNova & Nebula", "Mythos & Nebula"].includes(c.label)).map((combo) => (
      <div key={combo.label} className="p-4 bg-gray-800 rounded shadow flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{combo.label}</h3>
        <p className="text-sm">Games: {combo.plays}</p>
        <p className="text-sm">Wins: {combo.wins}</p>
        <p className="text-sm">Losses: {combo.losses}</p>
        <p className="text-sm font-bold">{combo.winPercentage}% Win Rate</p>
      </div>
    ))}
  </div>
  {/* Third row: single bot only */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
    {fhgMatrixStats.filter(c => ["SuperNova Only", "Nebula Only", "Mythos Only"].includes(c.label)).map((combo) => (
      <div key={combo.label} className="p-4 bg-gray-800 rounded shadow flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{combo.label}</h3>
        <p className="text-sm">Games: {combo.plays}</p>
        <p className="text-sm">Wins: {combo.wins}</p>
        <p className="text-sm">Losses: {combo.losses}</p>
        <p className="text-sm font-bold">{combo.winPercentage}% Win Rate</p>
      </div>
    ))}
  </div>
</div>

        {/* Mythos Dataset FHG % Card */}
<div className="w-full flex justify-center mb-6">
  <div className="p-6 bg-gray-800 rounded shadow flex flex-col items-center max-w-md w-full">
    <h2 className="text-xl font-bold mb-2">Dataset Wide First Half Goal %</h2>
    <p className="text-base">Games: {mythosFHGPlays}</p>
    <p className="text-base">FHG %: <span className="font-bold">{mythosFHGPercent}</span></p>
  </div>
</div>

        {/* First Half Goals Before 30th Minute Correlation Matrix - Card Format */}
<h2 className="text-2xl font-bold mt-6 mb-2">First Goal Before 30th Minute Correlation Matrix</h2>
<p className="text-gray-300 text-center mb-4 max-w-4xl">
  This matrix analyzes bot signal combinations and their success rate for predicting goals scored within the first 30 minutes of matches. 
  Data is cross-referenced with the Mythos Dataset to determine exact goal timing. Games are marked as wins if the first goal occurs 
  between 0-30 minutes, otherwise it is marked as a loss. If no goal timing data is available, games are not included.
  Filter by league to use this!
</p>
<div className="flex flex-col items-center w-full mb-6">
  {/* Top: All Three Agree */}
  {fhgBefore30MatrixStats.filter((c: any) => c.label === "All Three Agree").map((combo: any) => (
    <div key={combo.label} className="p-6 mb-4 bg-gray-800 rounded shadow flex flex-col items-center w-full max-w-md">
      <h3 className="text-xl font-bold mb-2">{combo.label}</h3>
      <p className="text-base">Total Games: {combo.validPlays}</p>
      <p className="text-base">Wins: {combo.wins} | Losses: {combo.losses}</p>
      <p className="text-base font-bold">{combo.winPercentage}% Win Rate</p>
    </div>
  ))}
  {/* Second row: 2-bot combos */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-4 justify-center">
    {fhgBefore30MatrixStats.filter((c: any) => ["SuperNova & Mythos", "SuperNova & Nebula", "Mythos & Nebula"].includes(c.label)).map((combo: any) => (
      <div key={combo.label} className="p-4 bg-gray-800 rounded shadow flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{combo.label}</h3>
        <p className="text-sm">Total: {combo.validPlays}</p>
        <p className="text-sm">Wins: {combo.wins} | Losses: {combo.losses}</p>
        <p className="text-sm font-bold">{combo.winPercentage}% Win Rate</p>
      </div>
    ))}
  </div>
  {/* Third row: single bot only */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
    {fhgBefore30MatrixStats.filter((c: any) => ["SuperNova Only", "Nebula Only", "Mythos Only"].includes(c.label)).map((combo: any) => (
      <div key={combo.label} className="p-4 bg-gray-800 rounded shadow flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{combo.label}</h3>
        <p className="text-sm">Total: {combo.validPlays}</p>
        <p className="text-sm">Wins: {combo.wins} | Losses: {combo.losses}</p>
        <p className="text-sm font-bold">{combo.winPercentage}% Win Rate</p>
      </div>
    ))}
  </div>
</div>

{/* Dataset Wide Before 30th Minute % Card */}
<div className="w-full flex justify-center mb-6">
  <div className="p-6 bg-gray-800 rounded shadow flex flex-col items-center max-w-md w-full">
    <h2 className="text-xl font-bold mb-2">Dataset Wide Before 30th Minute %</h2>
    <p className="text-base">Total Games: {(() => {
      const mythosLookup = new Map();
      mythosData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        mythosLookup.set(key, row);
      });
      
      let totalGames = 0;
      let validGames = 0;
      let wins = 0;
      let disregarded = 0;
      
      mythosFiltered.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        const mythosRow = mythosLookup.get(key);
        totalGames++;
        
        if (!mythosRow) {
          disregarded++;
          return;
        }
        
        const firstGoalTime = mythosRow["First Goal Time"];
        const homeHT = Number(mythosRow["Home HT Score"] || 0);
        const awayHT = Number(mythosRow["Away HT Score"] || 0);
        
        // Disregard conditions
        if (firstGoalTime === -1 || firstGoalTime === "-") {
          disregarded++;
          return;
        }
        
        // If no first goal time but HT score >= 1, disregard
        if ((firstGoalTime === "" || firstGoalTime == null) && (homeHT + awayHT) >= 1) {
          disregarded++;
          return;
        }
        
        validGames++;
        
        // Win conditions: First Goal Time 0-31
        if (firstGoalTime >= 0 && firstGoalTime <= 31) {
          wins++;
        }
      });
      
      return totalGames;
    })()}</p>
    <p className="text-base">Valid Games: {(() => {
      const mythosLookup = new Map();
      mythosData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        mythosLookup.set(key, row);
      });
      
      let validGames = 0;
      
      mythosFiltered.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        const mythosRow = mythosLookup.get(key);
        
        if (!mythosRow) return;
        
        const firstGoalTime = mythosRow["First Goal Time"];
        const homeHT = Number(mythosRow["Home HT Score"] || 0);
        const awayHT = Number(mythosRow["Away HT Score"] || 0);
        
        // Disregard conditions
        if (firstGoalTime === -1 || firstGoalTime === "-") return;
        if ((firstGoalTime === "" || firstGoalTime == null) && (homeHT + awayHT) >= 1) return;
        
        validGames++;
      });
      
      return validGames;
    })()}</p>
    <p className="text-base">Before 30min %: <span className="font-bold">{(() => {
      const mythosLookup = new Map();
      mythosData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        mythosLookup.set(key, row);
      });
      
      let validGames = 0;
      let wins = 0;
      
      mythosFiltered.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        const mythosRow = mythosLookup.get(key);
        
        if (!mythosRow) return;
        
        const firstGoalTime = mythosRow["First Goal Time"];
        const homeHT = Number(mythosRow["Home HT Score"] || 0);
        const awayHT = Number(mythosRow["Away HT Score"] || 0);
        
        // Disregard conditions
        if (firstGoalTime === -1 || firstGoalTime === "-") return;
        if ((firstGoalTime === "" || firstGoalTime == null) && (homeHT + awayHT) >= 1) return;
        
        validGames++;
        
        // Win conditions: First Goal Time 0-31
        if (firstGoalTime >= 0 && firstGoalTime <= 31) {
          wins++;
        }
      });
      
      return validGames > 0 ? ((wins / validGames) * 100).toFixed(2) : "N/A";
    })()}%</span></p>
  </div>
</div>
    </div>
        
    );
}

// npm run dev to start
// kill-port 3000 to kill

