"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

// Type for matrix stats result
type MatrixStatsResult = {
  label: string;
  plays: number;
  validPlays: number;
  wins: number;
  losses: number;
  disregarded: number;
  winPercentage: string;
  profit: string;
  roi: string;
};

export default function SearchResults() {
    const params = useParams();
    const router = useRouter();
    const experienceId = params.experienceId as string;
    
    const [data, setData] = useState<SoccerData[]>([]); 
    const [selectedLeague, setSelectedLeague] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedTeam2, setSelectedTeam2] = useState("");
    const [team1HomeOnly, setTeam1HomeOnly] = useState(false);
    const [team1AwayOnly, setTeam1AwayOnly] = useState(false);
    const [team2HomeOnly, setTeam2HomeOnly] = useState(false);
    const [team2AwayOnly, setTeam2AwayOnly] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [horizonData, setHorizonData] = useState<SoccerData[]>([]);
    const [mythosData, setMythosData] = useState<SoccerData[]>([]);
    const [activeTab, setActiveTab] = useState("overview");

    const clearFilters = () => {
        setSelectedLeague(""); // Reset league selection 
        setSelectedTeam(""); // Reset selected teams
        setSelectedTeam2(""); // Reset second team
        setTeam1HomeOnly(false); // Reset team 1 home filter
        setTeam1AwayOnly(false); // Reset team 1 away filter
        setTeam2HomeOnly(false); // Reset team 2 home filter
        setTeam2AwayOnly(false); // Reset team 2 away filter
        setStartDate("");
        setEndDate("");
    };


    useEffect(() => {
        fetch("/api/data")
            .then(response => response.json())
            .then(data => {
                console.log("Data loaded:", data);
                setData(data.soccer || []);
                setHorizonData(data.horizon || []);
                setMythosData(data.mythos || []);
            })
            .catch(console.error);

        fetch("/api/whop")
            .then(response => response.json())
            .then(data => {
                console.log("Whop data loaded:", data);
            })
            .catch(console.error);
    }, []);
    useEffect(() => {
        if (selectedLeague) {
            setSelectedTeam(""); // Reset teams when league changes
            setSelectedTeam2(""); // Reset second team when league changes
        }
    }, [selectedLeague]);

      // Function to filter by team selection (now supports 2 teams with checkbox filters)
    const filterByTeam = (data: SoccerData[]) => {
        if (!selectedTeam && !selectedTeam2) return data;

        return data.filter((row) => {
            let matchesTeam1 = false;
            let matchesTeam2 = false;
            
            // Check first team with checkbox filters
            if (selectedTeam) {
                if (team1HomeOnly && !team1AwayOnly) {
                    matchesTeam1 = row["Home Team"] === selectedTeam;
                } else if (team1AwayOnly && !team1HomeOnly) {
                    matchesTeam1 = row["Away Team"] === selectedTeam;
                } else {
                    // If both checkboxes are checked or neither is checked, show all games
                    matchesTeam1 = row["Home Team"] === selectedTeam || row["Away Team"] === selectedTeam;
                }
            } else {
                matchesTeam1 = true; // If no first team selected, consider it a match
            }
            
            // Check second team with checkbox filters
            if (selectedTeam2) {
                if (team2HomeOnly && !team2AwayOnly) {
                    matchesTeam2 = row["Home Team"] === selectedTeam2;
                } else if (team2AwayOnly && !team2HomeOnly) {
                    matchesTeam2 = row["Away Team"] === selectedTeam2;
                } else {
                    // If both checkboxes are checked or neither is checked, show all games
                    matchesTeam2 = row["Home Team"] === selectedTeam2 || row["Away Team"] === selectedTeam2;
                }
            } else {
                matchesTeam2 = true; // If no second team selected, consider it a match
            }
            
            // Return games that match either team
            return matchesTeam1 || matchesTeam2;
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
    // Calculate stats for each bucket with dynamic odds
    const fhgMatrixStats = matrixBuckets.map((bucket) => {
        const plays = filteredData.filter((row) => bucket.filter(getFHGSignals(row)));
        const wins = plays.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = plays.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentage = plays.length > 0 ? ((wins / plays.length) * 100).toFixed(1) : "N/A";
        
        // Create lookup for Horizon data to get Pregame Goal Line
        const horizonLookup = new Map();
        horizonData.forEach(row => {
            const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
            horizonLookup.set(key, row);
        });

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
        let totalProfit = 0;
        plays.forEach(row => {
            const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
            const horizonRow = horizonLookup.get(key);
            const pregameGoalLine = horizonRow ? Number(horizonRow["Pregame Line"] || 2.5) : 2.5;
            const fhgOdds = getFHGMatrixOdds(pregameGoalLine);
            const profitOnWin = fhgOdds - 1;
            
            const fhGoals = Number(row["FH Goals"]);
            if (fhGoals >= 1) {
                totalProfit += profitOnWin; // Win
            } else {
                totalProfit -= 1; // Loss
            }
        });

        const roi = plays.length > 0 ? ((totalProfit / plays.length) * 100).toFixed(1) : "0.0";
        
        return {
            label: bucket.label,
            plays: plays.length,
            wins,
            losses,
            winPercentage,
            profit: totalProfit.toFixed(1),
            roi
        };
    });


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
    
    // Handle team filtering with 2 teams and checkbox filters
    if (selectedTeam || selectedTeam2) {
        let teamMatch = false;
        
        if (selectedTeam) {
            if (team1HomeOnly && !team1AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam).trim();
            } else if (team1AwayOnly && !team1HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam).trim() || String(row["Away Team"]).trim() === String(selectedTeam).trim());
            }
        }
        
        if (selectedTeam2) {
            if (team2HomeOnly && !team2AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam2).trim();
            } else if (team2AwayOnly && !team2HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam2).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam2).trim() || String(row["Away Team"]).trim() === String(selectedTeam2).trim());
            }
        }
        
        match = match && teamMatch;
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
const mythosFHGPercent = mythosFHGPlays > 0 ? ((mythosFHGWins / mythosFHGPlays) * 100).toFixed(1) : "N/A";

// Filtering for Horizon Dataset
const horizonFiltered = horizonData.filter((row) => {
    let match = true;
    if (selectedLeague) match = match && String(row.League).trim() === String(selectedLeague).trim();
    
    // Handle team filtering with 2 teams and checkbox filters
    if (selectedTeam || selectedTeam2) {
        let teamMatch = false;
        
        if (selectedTeam) {
            if (team1HomeOnly && !team1AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam).trim();
            } else if (team1AwayOnly && !team1HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam).trim() || String(row["Away Team"]).trim() === String(selectedTeam).trim());
            }
        }
        
        if (selectedTeam2) {
            if (team2HomeOnly && !team2AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam2).trim();
            } else if (team2AwayOnly && !team2HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam2).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam2).trim() || String(row["Away Team"]).trim() === String(selectedTeam2).trim());
            }
        }
        
        match = match && teamMatch;
    }
    
    if (startDate && row.Date) match = match && new Date(row.Date) >= new Date(startDate);
    if (endDate && row.Date) match = match && new Date(row.Date) <= new Date(endDate);
    
    return match;
});
// Horizon FHG Stats - Only include games where FTG = "Over"
const horizonFHGFiltered = horizonFiltered.filter(row => row["FHG"] === "Over");
const horizonFHGPlays = horizonFHGFiltered.length;
const horizonFHGWins = horizonFHGFiltered.filter(row => Number(row["FH Goals"] || 0) >= 1).length;
const horizonFHGPercent = horizonFHGPlays > 0 ? ((horizonFHGWins / horizonFHGPlays) * 100).toFixed(1) : "N/A";

// Horizon FHG Profit calculation using dynamic odds based on Pregame Goal Line
const getHorizonFHGOdds = (pregameGoalLine: number): number => {
    if (pregameGoalLine >= 3.25) return 1.44;
    if (pregameGoalLine === 3.0) return 1.5;
    if (pregameGoalLine === 2.75) return 1.5;
    if (pregameGoalLine === 2.5) return 1.55;
    if (pregameGoalLine === 2.25) return 1.65;
    if (pregameGoalLine === 2.0) return 1.7;
    if (pregameGoalLine <= 1.75) return 1.9;
    return 1.7; // Default fallback
};

let horizonFHGTotalProfit = 0;
horizonFHGFiltered.forEach(row => {
    const pregameGoalLine = Number(row["Pregame Line"] || 2.5);
    const fhgOdds = getHorizonFHGOdds(pregameGoalLine);
    const profitOnWin = fhgOdds - 1;
    
    const fhGoals = Number(row["FH Goals"] || 0);
    if (fhGoals >= 1) {
        horizonFHGTotalProfit += profitOnWin; // Win
    } else {
        horizonFHGTotalProfit -= 1; // Loss
    }
});

const horizonFHGROI = horizonFHGPlays > 0 ? ((horizonFHGTotalProfit / horizonFHGPlays) * 100).toFixed(1) : "0.0";
// Horizon FTG Stats - Only include games with Over/Under in FTG column and exclude 'Argentine Division 2'
const horizonFTGFiltered = horizonFiltered.filter(row => (row["FTG"] === "Over" || row["FTG"] === "Under") && row.League !== "Argentine Division 2");
const horizonFTGPlays = horizonFTGFiltered.length;
// const horizonFTGWins = horizonFTGFiltered.filter(row => Number(row["FT Goals"] || 0) > Number(row["Pregame Line"] || 0)).length;
// const horizonFTGPercent = horizonFTGPlays > 0 ? ((horizonFTGWins / horizonFTGPlays) * 100).toFixed(2) : "N/A";
// Only include games with FTC = "Over" or "Under" for FTC stats
const horizonFTCFiltered = horizonFiltered.filter(row => row["FTC"] === "Over" || row["FTC"] === "Under");
const horizonFTCPlays = horizonFTCFiltered.length;
// const horizonFTCWins = horizonFTCFiltered.filter(row => Number(row["FT Corners"] || 0) > Number(row["Pregame Corner Line"] || 0)).length;
// const horizonFTCPercent = horizonFTCPlays > 0 ? ((horizonFTCWins / horizonFTCPlays) * 100).toFixed(2) : "N/A";

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

    
    horizonFTGFiltered.forEach(row => {
        const ftGoals = Number(row["FT Goals"] || 0);
        const line = Number(row["Pregame Line"] || 0);
        if (row["FTG"] === "Over") {
            const odds = Number(row["Over Goal Odds"] || 1.9);
            const result = evaluateAsianResult("Over", ftGoals, line);
            if (result === "Win") overProfit += (odds - 1);
            else if (result === "Win/Push") overProfit += (odds - 1) / 2;
            else if (result === "Push") overProfit += 0;
            else if (result === "Loss/Push") overProfit -= 0.5;
            else if (result === "Loss") overProfit -= 1;
        }
        if (row["FTG"] === "Under") {
            const odds = Number(row["Under Goal Odds"] || 1.9);
            const result = evaluateAsianResult("Under", ftGoals, line);
            if (result === "Win") underProfit += (odds - 1);
            else if (result === "Win/Push") underProfit += (odds - 1) / 2;
            else if (result === "Push") underProfit += 0;
            else if (result === "Loss/Push") underProfit -= 0.5;
            else if (result === "Loss") underProfit -= 1;
        }
    });
    
    return {
        overProfit: overProfit.toFixed(1),
        underProfit: underProfit.toFixed(1)
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
        overProfit: overProfit.toFixed(1),
        underProfit: underProfit.toFixed(1)
    };
}
const horizonFTCProfits = calculateHorizonFTCProfit();

// --- Double Chance Logic ---
// Filter Double Chance data from main data array (not horizon)
const doubleChanceFiltered = data.filter((row) => {
    let match = true;
    if (selectedLeague) match = match && String(row.League).trim() === String(selectedLeague).trim();
    
    // Handle team filtering with 2 teams and checkbox filters
    if (selectedTeam || selectedTeam2) {
        let teamMatch = false;
        
        if (selectedTeam) {
            if (team1HomeOnly && !team1AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam).trim();
            } else if (team1AwayOnly && !team1HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam).trim() || String(row["Away Team"]).trim() === String(selectedTeam).trim());
            }
        }
        
        if (selectedTeam2) {
            if (team2HomeOnly && !team2AwayOnly) {
                teamMatch = teamMatch || String(row["Home Team"]).trim() === String(selectedTeam2).trim();
            } else if (team2AwayOnly && !team2HomeOnly) {
                teamMatch = teamMatch || String(row["Away Team"]).trim() === String(selectedTeam2).trim();
            } else {
                teamMatch = teamMatch || (String(row["Home Team"]).trim() === String(selectedTeam2).trim() || String(row["Away Team"]).trim() === String(selectedTeam2).trim());
            }
        }
        
        match = match && teamMatch;
    }
    
    if (startDate && row.Date) match = match && new Date(row.Date) >= new Date(startDate);
    if (endDate && row.Date) match = match && new Date(row.Date) <= new Date(endDate);
    
    const doubleChance = (row["Double Chance"] || "").toString().trim();
    const odds = Number(row["Double Chance Odds"] || 0);
    
    // Must have valid Double Chance data
    if (!doubleChance || doubleChance === "") {
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
    return match;
});

// Calculate Double Chance stats and profits
const calculateDoubleChanceStats = () => {
    let homeDrawPlays = 0;
    let homeDrawWins = 0;
    let homeDrawProfit = 0;
    
    let homeAwayPlays = 0;
    let homeAwayWins = 0;
    let homeAwayProfit = 0;
    
    // Create lookup map for mythos data to get final scores
    const mythosLookup = new Map();
    mythosData.forEach(row => {
        const key = `${row.Date}_${row.League}_${row["Home Team"]}`;
        mythosLookup.set(key, row);
    });
    
    doubleChanceFiltered.forEach(row => {
        const key = `${row.Date}_${row.League}_${row["Home Team"]}`;
        const mythosRow = mythosLookup.get(key);
        
        if (!mythosRow) return; // Skip if no match found
        
        const homeFT = Number(mythosRow["Home FT Score"] || 0);
        const awayFT = Number(mythosRow["Away FT Score"] || 0);
        const doubleChance = (row["Double Chance"] || "").toString().trim();
        let odds = Number(row["Double Chance Odds"] || 1);
        let betType = doubleChance;
        
        if (doubleChance === "Home / Draw") {
            // If Home / Draw with odds < 1.18, swap to Home ML
            if (odds < 1.18) {
                const homeMLOdds = Number(mythosRow["Home ML"] || 0);
                if (homeMLOdds > 0) {
                    odds = homeMLOdds;
                    betType = "Home ML";
                }
            }
            
            homeDrawPlays++;
            let isWin = false;
            
            if (betType === "Home ML") {
                isWin = homeFT > awayFT;
            } else {
                isWin = homeFT >= awayFT; // Home win or draw
            }
            
            if (isWin) {
                homeDrawWins++;
                homeDrawProfit += (odds - 1);
            } else {
                homeDrawProfit -= 1;
            }
            
        } else if (doubleChance === "Home / Away") {
            homeAwayPlays++;
            const isWin = homeFT !== awayFT; // Home win or away win (not draw)
            
            if (isWin) {
                homeAwayWins++;
                homeAwayProfit += (odds - 1);
            } else {
                homeAwayProfit -= 1;
            }
        }
    });
    
    return {
        homeDraw: {
            plays: homeDrawPlays,
            wins: homeDrawWins,
            winRate: homeDrawPlays > 0 ? ((homeDrawWins / homeDrawPlays) * 100).toFixed(1) : "N/A",
            profit: homeDrawProfit.toFixed(1),
            roi: homeDrawPlays > 0 ? ((homeDrawProfit / homeDrawPlays) * 100).toFixed(1) : "0"
        },
        homeAway: {
            plays: homeAwayPlays,
            wins: homeAwayWins,
            winRate: homeAwayPlays > 0 ? ((homeAwayWins / homeAwayPlays) * 100).toFixed(1) : "N/A",
            profit: homeAwayProfit.toFixed(1),
            roi: homeAwayPlays > 0 ? ((homeAwayProfit / homeAwayPlays) * 100).toFixed(1) : "0"
        }
    };
};

const doubleChanceStats = calculateDoubleChanceStats();

// --- FHG Correlation Matrix for Goals Before 30th Minute (using Mythos Dataset) ---
const calculateFHGBefore30Matrix = () => {
    // Create a key-based lookup for Mythos data
    const mythosLookup = new Map();
    mythosData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        mythosLookup.set(key, row);
    });

    // Create a key-based lookup for Horizon data to get Pregame Goal Line
    const horizonLookup = new Map();
    horizonData.forEach(row => {
        const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
        horizonLookup.set(key, row);
    });

    // B30 Odds dictionary based on Pregame Goal Line
    const getB30Odds = (pregameGoalLine: number): number => {
        if (pregameGoalLine >= 3.25) return 1.55;
        if (pregameGoalLine === 3.0) return 1.63;
        if (pregameGoalLine === 2.75) return 1.72;
        if (pregameGoalLine === 2.5) return 1.9;
        if (pregameGoalLine === 2.25) return 2.0;
        if (pregameGoalLine === 2.0) return 2.25;
        if (pregameGoalLine === 1.75) return 2.6;
        if (pregameGoalLine <= 1.5) return 2.8;
        return 1.9; // Default fallback
    };

    // Matrix buckets for before 30 analysis
    const matrixBuckets = [
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
    return matrixBuckets.map((bucket) => {
        const plays = filteredData.filter((row) => bucket.filter(getFHGSignals(row)));
        let wins = 0;
        let losses = 0;
        let disregarded = 0;
        // Remove unused variables
        // let matchedCount = 0;
        // let notFoundCount = 0;
        let totalProfit = 0;

        plays.forEach(row => {
            const key = `${row.Date}_${row["Home Team"]}_${row["Away Team"]}`;
            const mythosRow = mythosLookup.get(key);
            const horizonRow = horizonLookup.get(key);
            
            if (!mythosRow) {
                // notFoundCount++; // Removed unused variable
                disregarded++;
                return;
            }

            // matchedCount++; // Removed unused variable
            const firstGoalTime = mythosRow["First Goal Time"];
            const homeHT = Number(mythosRow["Home HT Score"] || 0);
            const awayHT = Number(mythosRow["Away HT Score"] || 0);
            
            // Get the appropriate B30 odds based on Pregame Goal Line
            const pregameGoalLine = horizonRow ? Number(horizonRow["Pregame Line"] || 2.5) : 2.5;
            const b30Odds = getB30Odds(pregameGoalLine);
            const profitOnWin = b30Odds - 1;
            
            // Disregard conditions
            if (firstGoalTime === -1 || firstGoalTime === "-") {
                disregarded++;
                return;
            }
            
            // Handle blank First Goal Time
            if (firstGoalTime === "" || firstGoalTime == null) {
                // If both HT scores are 0, it's a loss (no goals scored)
                if ((homeHT + awayHT) === 0) {
                    losses++;
                    totalProfit -= 1; // Loss
                } else {
                    // If HT scores show goals but no timing data, disregard
                    disregarded++;
                }
                return;
            }

            // Win conditions: First Goal Time 0-31
            if (firstGoalTime >= 0 && firstGoalTime <= 31) {
                wins++;
                totalProfit += profitOnWin; // Win with dynamic odds
            }
            // Loss conditions: First Goal Time > 31
            else if (firstGoalTime > 31) {
                losses++;
                totalProfit -= 1; // Loss
            } else {
                disregarded++;
            }
        });

        const totalValidPlays = wins + losses;
        const winPercentage = totalValidPlays > 0 ? ((wins / totalValidPlays) * 100).toFixed(1) : "N/A";
        const roi = totalValidPlays > 0 ? ((totalProfit / totalValidPlays) * 100).toFixed(1) : "0.0";
        
        return {
            label: bucket.label,
            plays: plays.length,
            validPlays: totalValidPlays,
            wins,
            losses,
            disregarded,
            winPercentage,
            profit: totalProfit.toFixed(1),
            roi
        };
    });
};

const fhgBefore30MatrixStats = calculateFHGBefore30Matrix();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex flex-col items-center p-6">
        {/* Beautiful Header Section */}
        <div className="w-full max-w-6xl relative mb-8">
            <div className="text-center">
                <div className="mb-6 p-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 shadow-2xl inline-block">
                    <div className="text-3xl">⚽</div>
                </div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-slate-300 bg-clip-text text-transparent">
                    Velorium Dashboard
                </h1>
                <p className="text-slate-300 text-lg mb-4">Advanced Analytics & Performance Insights</p>
            </div>
            <button
                onClick={() => router.push(`/experience/${experienceId}`)}
                className="absolute top-0 right-0 group px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
            >
                <span className="relative z-10">← Back to Home</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
        </div>
        {/* Beautiful Filters Section - Conservatively Styled */}
        <div className="w-full max-w-4xl mb-8">
            <div className="relative">
                {/* Beautiful Container Background */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur opacity-20"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 rounded-2xl shadow-2xl p-8 border border-slate-700/20">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            Advanced Filters
                        </h2>
                        <p className="text-slate-400 text-sm">Customize your analytics view</p>
                    </div>
                    
                    {/* League Filter */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white mb-3">League Selection</label>
                        <select
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
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
                    </div>

                    {/* Team Filters Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Team 1 Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-white">Team 1 (Optional)</label>
                            <select
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                value={selectedTeam}
                            >
                                <option value="">Select Team 1</option>
                                {uniqueTeams.map((team) => (
                                    <option key={team} value={team}>
                                    {team}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-4 text-sm">
                                <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={team1HomeOnly}
                                        onChange={(e) => setTeam1HomeOnly(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    Home Only
                                </label>
                                <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={team1AwayOnly}
                                        onChange={(e) => setTeam1AwayOnly(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    Away Only
                                </label>
                            </div>
                        </div>

                        {/* Team 2 Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-white">Team 2 (Optional)</label>
                            <select
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                                onChange={(e) => setSelectedTeam2(e.target.value)}
                                value={selectedTeam2}
                            >
                                <option value="">Select Team 2</option>
                                {uniqueTeams.map((team) => (
                                    <option key={team} value={team}>
                                    {team}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-4 text-sm">
                                <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={team2HomeOnly}
                                        onChange={(e) => setTeam2HomeOnly(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    Home Only
                                </label>
                                <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={team2AwayOnly}
                                        onChange={(e) => setTeam2AwayOnly(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    Away Only
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Date Range Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-3">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-3">End Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Clear Filters Button */}
                    <div className="text-center">
                        <button 
                            onClick={clearFilters} 
                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl text-white font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Beautiful Tab Navigation */}
        <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-r from-slate-800/80 to-gray-900/80 backdrop-blur-lg p-2 rounded-2xl shadow-2xl border border-slate-700/20 max-w-4xl w-full">
                <div className="grid grid-cols-3 gap-1">
                    {[
                        { id: "overview", label: "Overview" },
                        { id: "double-chance", label: "Double Chance" },
                        { id: "horizon", label: "Horizon Analysis" },
                        { id: "fhg-matrix", label: "FHG Matrix" },
                        { id: "advanced", label: "B30 Matrix" },
                        { id: "details", label: "Details" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 text-center ${
                                activeTab === tab.id
                                    ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25"
                                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <>
            <div className="w-full max-w-6xl mb-12">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl backdrop-blur-sm border border-cyan-300/20">
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    Top Software Performance
                  </h2>
                </div>
              </div>
              <p className="text-slate-300 text-lg text-center mb-8">Premium analytics delivering consistent results</p>
              
              {/* Top Software Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Total Double Chance Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Total Performance</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                          {(() => {
                            const totalPlays = doubleChanceStats.homeDraw.plays + doubleChanceStats.homeAway.plays;
                            const totalWins = doubleChanceStats.homeDraw.wins + doubleChanceStats.homeAway.wins;
                            return totalPlays > 0 ? ((totalWins / totalPlays) * 100).toFixed(1) : "N/A";
                          })()}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Total Double Chance</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Games Played</span>
                        <span className="font-semibold text-white">{doubleChanceStats.homeDraw.plays + doubleChanceStats.homeAway.plays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-emerald-400">{doubleChanceStats.homeDraw.wins + doubleChanceStats.homeAway.wins}W - {(doubleChanceStats.homeDraw.plays + doubleChanceStats.homeAway.plays) - (doubleChanceStats.homeDraw.wins + doubleChanceStats.homeAway.wins)}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Profit</span>
                        <span className="font-bold text-lg text-emerald-400">{(Number(doubleChanceStats.homeDraw.profit) + Number(doubleChanceStats.homeAway.profit)) >= 0 ? '+' : ''}{(Number(doubleChanceStats.homeDraw.profit) + Number(doubleChanceStats.homeAway.profit)).toFixed(1)}U</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className="font-bold text-lg text-cyan-400">{(() => {
                          const totalPlays = doubleChanceStats.homeDraw.plays + doubleChanceStats.homeAway.plays;
                          const totalProfit = Number(doubleChanceStats.homeDraw.profit) + Number(doubleChanceStats.homeAway.profit);
                          return totalPlays > 0 ? ((totalProfit / totalPlays) * 100).toFixed(1) : "0";
                        })()}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Horizon FHG % Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-orange-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                        <div className="text-2xl">🔮</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Win Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                          {horizonFHGPercent}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Horizon FHG Analytics</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Games Analyzed</span>
                        <span className="font-semibold text-white">{horizonFHGPlays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-orange-400">{horizonFHGWins}W - {horizonFHGPlays - horizonFHGWins}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Net Profit</span>
                        <span className="font-bold text-lg text-orange-400">{horizonFHGTotalProfit >= 0 ? '+' : ''}{horizonFHGTotalProfit.toFixed(1)}U</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className="font-bold text-lg text-red-400">{horizonFHGROI}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                  Dataset Analytics
                </h3>
                <p className="text-slate-300">Comprehensive dataset performance insights</p>
              </div>
              
              {/* Dataset Wide Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dataset Wide FHG % Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-blue-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
                        <div className="text-2xl">📊</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">FHG Success Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                          {mythosFHGPercent}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Dataset Wide FHG %</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Total Games</span>
                        <span className="font-semibold text-white">{mythosFHGPlays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Analysis Type</span>
                        <span className="font-semibold text-blue-400">First Half Goals</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Dataset Wide Before 30min % Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-purple-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                        <div className="text-2xl">⏱️</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">B30 Success Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          {(() => {
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
                              
                              if (firstGoalTime === -1 || firstGoalTime === "-") return;
                              
                              if (firstGoalTime === "" || firstGoalTime == null) {
                                if ((homeHT + awayHT) === 0) {
                                  validGames++;
                                }
                                return;
                              }
                              
                              validGames++;
                              
                              if (firstGoalTime >= 0 && firstGoalTime <= 31) {
                                wins++;
                              }
                            });
                            
                            return validGames > 0 ? ((wins / validGames) * 100).toFixed(1) : "N/A";
                          })()}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Dataset Wide B30 %</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Valid Games</span>
                        <span className="font-semibold text-white">{(() => {
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
                            
                            if (firstGoalTime === -1 || firstGoalTime === "-") return;
                            
                            if (firstGoalTime === "" || firstGoalTime == null) {
                              if ((homeHT + awayHT) === 0) {
                                validGames++;
                              }
                              return;
                            }
                            
                            validGames++;
                          });
                          
                          return validGames;
                        })()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Analysis Type</span>
                        <span className="font-semibold text-purple-400">Before 30 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Double Chance Tab Content */}
        {activeTab === "double-chance" && (
          <>
            <div className="w-full max-w-6xl">
              {/* Beautiful Section Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl backdrop-blur-sm border border-emerald-300/20">
                    <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                    Double Chance Results
                  </h2>
                </div>
              </div>
              <p className="text-slate-300 text-center mb-8">Advanced double chance betting strategies & performance</p>
              
              {/* Double Chance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Home/Draw Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                        <div className="text-2xl">🏠</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Win Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                          {doubleChanceStats.homeDraw.winRate}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Home / Draw Strategy</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Games Played</span>
                        <span className="font-semibold text-white">{doubleChanceStats.homeDraw.plays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-emerald-400">{doubleChanceStats.homeDraw.wins}W - {doubleChanceStats.homeDraw.plays - doubleChanceStats.homeDraw.wins}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Net Profit</span>
                        <span className={`font-bold text-lg ${Number(doubleChanceStats.homeDraw.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Number(doubleChanceStats.homeDraw.profit) >= 0 ? '+' : ''}{doubleChanceStats.homeDraw.profit}U
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className={`font-bold text-lg ${Number(doubleChanceStats.homeDraw.roi) >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                          {doubleChanceStats.homeDraw.roi}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Home/Away Card */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg">
                        <div className="text-2xl">⚔️</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Win Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                          {doubleChanceStats.homeAway.winRate}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Home / Away Strategy</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Games Played</span>
                        <span className="font-semibold text-white">{doubleChanceStats.homeAway.plays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-cyan-400">{doubleChanceStats.homeAway.wins}W - {doubleChanceStats.homeAway.plays - doubleChanceStats.homeAway.wins}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Net Profit</span>
                        <span className={`font-bold text-lg ${Number(doubleChanceStats.homeAway.profit) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {Number(doubleChanceStats.homeAway.profit) >= 0 ? '+' : ''}{doubleChanceStats.homeAway.profit}U
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className={`font-bold text-lg ${Number(doubleChanceStats.homeAway.roi) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          {doubleChanceStats.homeAway.roi}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Horizon Analysis Tab Content */}
        {activeTab === "horizon" && (
          <>
            <div className="w-full max-w-6xl">
              {/* Beautiful Section Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl backdrop-blur-sm border border-orange-300/20">
                    <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-300 to-yellow-300 bg-clip-text text-transparent">
                    Horizon Analysis Results
                  </h2>
                </div>
              </div>
              <p className="text-gray-300 text-center mb-2 max-w-4xl mx-auto leading-relaxed">Advanced Asian totals & corner betting performance</p>
              <p className="text-center mb-8 max-w-4xl mx-auto">
                <span className="text-orange-300 font-semibold">Filter by league to use this!</span>
              </p>
              
              {/* Horizon Dataset FTG/FTC Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FTG Card (Asian Totals) */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-orange-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Asian Totals</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                          {horizonFTGPlays}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Horizon FTG (Asian Total)</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Total Games</span>
                        <span className="font-semibold text-white">{horizonFTGPlays}</span>
                      </div>
                      
                      {/* Over Section */}
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-4 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                          <span>📈</span> Over Bets
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-green-400 font-bold">{horizonFTGOverResults.Win}W</div>
                            <div className="text-slate-400">Full Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-yellow-400 font-bold">{horizonFTGOverResults["Win/Push"]}WP</div>
                            <div className="text-slate-400">Half Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-400 font-bold">{horizonFTGOverResults["Loss/Push"]}LP</div>
                            <div className="text-slate-400">Half Loss</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-400 font-bold">{horizonFTGOverResults.Loss}L</div>
                            <div className="text-slate-400">Full Loss</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex justify-between">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(horizonFTGProfits.overProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(horizonFTGProfits.overProfit) >= 0 ? '+' : ''}{horizonFTGProfits.overProfit}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${(() => {
                            const overPlays = horizonFTGOverResults.Win + horizonFTGOverResults["Win/Push"] + horizonFTGOverResults.Push + horizonFTGOverResults["Loss/Push"] + horizonFTGOverResults.Loss;
                            const roi = overPlays > 0 ? ((Number(horizonFTGProfits.overProfit) / overPlays) * 100) : 0;
                            return roi >= 0 ? 'text-green-400' : 'text-red-400';
                          })()}`}>
                            {(() => {
                              const overPlays = horizonFTGOverResults.Win + horizonFTGOverResults["Win/Push"] + horizonFTGOverResults.Push + horizonFTGOverResults["Loss/Push"] + horizonFTGOverResults.Loss;
                              const roi = overPlays > 0 ? ((Number(horizonFTGProfits.overProfit) / overPlays) * 100).toFixed(1) : "0";
                              return roi;
                            })()}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Under Section */}
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-4 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                          <span>📉</span> Under Bets
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-green-400 font-bold">{horizonFTGUnderResults.Win}W</div>
                            <div className="text-slate-400">Full Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-yellow-400 font-bold">{horizonFTGUnderResults["Win/Push"]}WP</div>
                            <div className="text-slate-400">Half Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-400 font-bold">{horizonFTGUnderResults["Loss/Push"]}LP</div>
                            <div className="text-slate-400">Half Loss</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-400 font-bold">{horizonFTGUnderResults.Loss}L</div>
                            <div className="text-slate-400">Full Loss</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex justify-between">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(horizonFTGProfits.underProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(horizonFTGProfits.underProfit) >= 0 ? '+' : ''}{horizonFTGProfits.underProfit}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${(() => {
                            const underPlays = horizonFTGUnderResults.Win + horizonFTGUnderResults["Win/Push"] + horizonFTGUnderResults.Push + horizonFTGUnderResults["Loss/Push"] + horizonFTGUnderResults.Loss;
                            const roi = underPlays > 0 ? ((Number(horizonFTGProfits.underProfit) / underPlays) * 100) : 0;
                            return roi >= 0 ? 'text-green-400' : 'text-red-400';
                          })()}`}>
                            {(() => {
                              const underPlays = horizonFTGUnderResults.Win + horizonFTGUnderResults["Win/Push"] + horizonFTGUnderResults.Push + horizonFTGUnderResults["Loss/Push"] + horizonFTGUnderResults.Loss;
                              const roi = underPlays > 0 ? ((Number(horizonFTGProfits.underProfit) / underPlays) * 100).toFixed(1) : "0";
                              return roi;
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* FTC Card - Over/Under breakdown */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-purple-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg">
                        <div className="text-2xl">🚩</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Corner Bets</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                          {horizonFTCPlays}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Horizon FTC</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Total Games</span>
                        <span className="font-semibold text-white">{horizonFTCPlays}</span>
                      </div>
                      
                      {/* Over Section */}
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-4 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                          <span>📈</span> Over Corners
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-green-400 font-bold">{horizonFTCFiltered.filter(r => r["FTC"] === "Over" && Number(r["FT Corners"] || 0) > Number(r["Pregame Corner Line"] || 0)).length}</div>
                            <div className="text-slate-400">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-400 font-bold">{horizonFTCFiltered.filter(r => r["FTC"] === "Over" && Number(r["FT Corners"] || 0) < Number(r["Pregame Corner Line"] || 0)).length}</div>
                            <div className="text-slate-400">Losses</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex justify-between">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(horizonFTCProfits.overProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(horizonFTCProfits.overProfit) >= 0 ? '+' : ''}{horizonFTCProfits.overProfit}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${(() => {
                            const overPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Over");
                            const roi = overPlays.length > 0 ? ((Number(horizonFTCProfits.overProfit) / overPlays.length) * 100) : 0;
                            return roi >= 0 ? 'text-green-400' : 'text-red-400';
                          })()}`}>
                            {(() => {
                              const overPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Over");
                              const roi = overPlays.length > 0 ? ((Number(horizonFTCProfits.overProfit) / overPlays.length) * 100).toFixed(1) : "0";
                              return roi;
                            })()}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Under Section */}
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-4 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                          <span>📉</span> Under Corners
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-green-400 font-bold">{horizonFTCFiltered.filter(r => r["FTC"] === "Under" && Number(r["FT Corners"] || 0) < Number(r["Pregame Corner Line"] || 0)).length}</div>
                            <div className="text-slate-400">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-400 font-bold">{horizonFTCFiltered.filter(r => r["FTC"] === "Under" && Number(r["FT Corners"] || 0) > Number(r["Pregame Corner Line"] || 0)).length}</div>
                            <div className="text-slate-400">Losses</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex justify-between">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(horizonFTCProfits.underProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(horizonFTCProfits.underProfit) >= 0 ? '+' : ''}{horizonFTCProfits.underProfit}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${(() => {
                            const underPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Under");
                            const roi = underPlays.length > 0 ? ((Number(horizonFTCProfits.underProfit) / underPlays.length) * 100) : 0;
                            return roi >= 0 ? 'text-green-400' : 'text-red-400';
                          })()}`}>
                            {(() => {
                              const underPlays = horizonFTCFiltered.filter(r => r["FTC"] === "Under");
                              const roi = underPlays.length > 0 ? ((Number(horizonFTCProfits.underProfit) / underPlays.length) * 100).toFixed(1) : "0";
                              return roi;
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* FHG Matrix Tab Content */}
        {activeTab === "fhg-matrix" && (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-purple-300/20">
                  <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                  First Half Goals Correlation Matrix
                </h2>
              </div>
            </div>
            <p className="text-gray-300 text-center mb-8 max-w-4xl mx-auto leading-relaxed">
              This matrix analyzes different combinations of bot signals for first half goals and their corresponding win rates. 
              Each combination shows how often at least one goal is scored in the first half when specific bots predict &quot;Over&quot; for FHG. 
              Results help identify which bot combinations are most reliable for first half goal predictions.
            </p>

            {/* Top Row: Dataset Wide FHG % + All Three Agree */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8 max-w-4xl mx-auto">
              {/* Dataset Wide FHG % Card */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-blue-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
                      <div className="text-2xl">📊</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-400">FHG Success Rate</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        {mythosFHGPercent}%
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4">Dataset Wide FHG %</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Games</span>
                      <span className="font-semibold text-white">{mythosFHGPlays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">FHG Success</span>
                      <span className="font-semibold text-blue-400">{mythosFHGWins}W - {mythosFHGPlays - mythosFHGWins}L</span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Analysis Type</span>
                      <span className="font-semibold text-blue-400">First Half Goals</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* All Three Agree Card */}
              {fhgMatrixStats.filter(c => c.label === "All Three Agree").map((combo) => (
                <div key={combo.label} className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Win Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                          {combo.winPercentage}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">{combo.label}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Games Analyzed</span>
                        <span className="font-semibold text-white">{combo.plays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-emerald-400">{combo.wins}W - {combo.losses}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Net Profit</span>
                        <span className={`font-bold text-lg ${Number(combo.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className={`font-bold text-lg ${Number(combo.roi) >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                          {combo.roi}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining 6 Cards in 2-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
              {/* Left Column: Single bot combinations (Standalones) */}
              <div className="flex flex-col gap-6">
                {fhgMatrixStats.filter(c => c.label === "Mythos Only").map((combo) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-purple-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                          <div className="text-lg">⚡</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Games:</span>
                          <span className="font-semibold text-white">{combo.plays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-purple-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {fhgMatrixStats.filter(c => c.label === "SuperNova Only").map((combo) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-orange-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                          <div className="text-lg">⭐</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Games:</span>
                          <span className="font-semibold text-white">{combo.plays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-orange-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-red-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {fhgMatrixStats.filter(c => c.label === "Nebula Only").map((combo) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg">
                          <div className="text-lg">🌌</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Games:</span>
                          <span className="font-semibold text-white">{combo.plays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-cyan-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Right Column: 2-bot combinations (Pairs) */}
              <div className="flex flex-col gap-6">
                {fhgMatrixStats.filter(c => ["SuperNova & Mythos", "SuperNova & Nebula", "Mythos & Nebula"].includes(c.label)).map((combo) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-indigo-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg">
                          <div className="text-lg">🤝</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Games:</span>
                          <span className="font-semibold text-white">{combo.plays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-indigo-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-zinc-400 mt-6 text-center">
              * Profit/ROI calculated using dynamic odds based on Pregame Goal Line
            </div>
          </>
        )}

        {/* B30 Matrix Tab Content */}
        {activeTab === "advanced" && (
          <>
            {/* First Half Goals Before 30th Minute Correlation Matrix - Card Format */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl backdrop-blur-sm border border-amber-300/20">
                  <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                  First Goal Before 30th Minute Matrix
                </h2>
              </div>
            </div>
            <p className="text-gray-300 text-center mb-8 max-w-4xl mx-auto leading-relaxed">
              This matrix analyzes bot signal combinations and their success rate for predicting goals scored within the first 30 minutes of matches. 
              Games are marked as wins if the first goal occurs 
              between 0-30 minutes, otherwise it is marked as a loss. If no goal timing data is available, games are not included.
              <span className="block mt-2 text-amber-300 font-semibold">Filter by league to use this!</span>
            </p>

            {/* Top Row: Dataset Wide Before 30min % + All Three Agree */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8 max-w-4xl mx-auto">
              {/* Dataset Wide Before 30min % Card */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-amber-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
                      <div className="text-2xl">⏱️</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-400">B30 Success Rate</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        {(() => {
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
                            
                            // Handle blank First Goal Time
                            if (firstGoalTime === "" || firstGoalTime == null) {
                              // If both HT scores are 0, count as valid game (loss)
                              if ((homeHT + awayHT) === 0) {
                                validGames++;
                                // This is a loss, so don't increment wins
                              }
                              // If HT scores show goals but no timing data, disregard (don't count)
                              return;
                            }
                            
                            validGames++;
                            
                            // Win conditions: First Goal Time 0-31
                            if (firstGoalTime >= 0 && firstGoalTime <= 31) {
                              wins++;
                            }
                          });
                          
                          return validGames > 0 ? ((wins / validGames) * 100).toFixed(1) : "N/A";
                        })()}%
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4">Dataset Wide B30 %</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Games</span>
                      <span className="font-semibold text-white">{mythosFiltered.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Valid Games</span>
                      <span className="font-semibold text-white">{(() => {
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
                          
                          // Handle blank First Goal Time
                          if (firstGoalTime === "" || firstGoalTime == null) {
                            // If both HT scores are 0, count as valid game (loss)
                            if ((homeHT + awayHT) === 0) {
                              validGames++;
                            }
                            // If HT scores show goals but no timing data, disregard (don't count)
                            return;
                          }
                          
                          validGames++;
                        });
                        
                        return validGames;
                      })()}</span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Analysis Type</span>
                      <span className="font-semibold text-amber-400">Before 30 min Goals</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* All Three Agree Card */}
              {fhgBefore30MatrixStats.filter((c: MatrixStatsResult) => c.label === "All Three Agree").map((combo: MatrixStatsResult) => (
                <div key={combo.label} className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-400">Win Rate</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                          {combo.winPercentage}%
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">{combo.label}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Valid Games</span>
                        <span className="font-semibold text-white">{combo.validPlays}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Win/Loss Record</span>
                        <span className="font-semibold text-emerald-400">{combo.wins}W - {combo.losses}L</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Net Profit</span>
                        <span className={`font-bold text-lg ${Number(combo.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">ROI</span>
                        <span className={`font-bold text-lg ${Number(combo.roi) >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                          {combo.roi}%
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining 6 Cards in 2-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
              {/* Left Column: Single bot combinations (Standalones) */}
              <div className="flex flex-col gap-6">
                {fhgBefore30MatrixStats.filter((c: MatrixStatsResult) => c.label === "Mythos Only").map((combo: MatrixStatsResult) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-purple-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                          <div className="text-lg">⚡</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Valid Games:</span>
                          <span className="font-semibold text-white">{combo.validPlays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-purple-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {fhgBefore30MatrixStats.filter((c: MatrixStatsResult) => c.label === "SuperNova Only").map((combo: MatrixStatsResult) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-orange-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                          <div className="text-lg">⭐</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Valid Games:</span>
                          <span className="font-semibold text-white">{combo.validPlays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-orange-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-red-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {fhgBefore30MatrixStats.filter((c: MatrixStatsResult) => c.label === "Nebula Only").map((combo: MatrixStatsResult) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg">
                          <div className="text-lg">🌌</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Valid Games:</span>
                          <span className="font-semibold text-white">{combo.validPlays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-cyan-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Right Column: 2-bot combinations (Pairs) */}
              <div className="flex flex-col gap-6">
                {fhgBefore30MatrixStats.filter((c: MatrixStatsResult) => ["SuperNova & Mythos", "SuperNova & Nebula", "Mythos & Nebula"].includes(c.label)).map((combo: MatrixStatsResult) => (
                  <div key={combo.label} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-slate-700/20 hover:border-indigo-500/30 transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg">
                          <div className="text-lg">🤝</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-400">Win Rate</div>
                          <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {combo.winPercentage}%
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3">{combo.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Valid Games:</span>
                          <span className="font-semibold text-white">{combo.validPlays}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">W/L:</span>
                          <span className="font-semibold text-indigo-400">{combo.wins}W - {combo.losses}L</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Profit:</span>
                          <span className={`font-bold ${Number(combo.profit) >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                            {Number(combo.profit) >= 0 ? '+' : ''}{combo.profit}U
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">ROI:</span>
                          <span className={`font-bold ${Number(combo.roi) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {combo.roi}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Details Tab Content */}
        {activeTab === "details" && (
          <>
            <div className="w-full max-w-6xl">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-slate-500/20 to-zinc-500/20 rounded-xl backdrop-blur-sm border border-slate-300/20">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-300 to-zinc-300 bg-clip-text text-transparent">
                    Methodology & Odds Calculations
                  </h2>
                </div>
              </div>
              <p className="text-slate-300 text-lg text-center mb-8">Understanding the analytics behind the dashboard</p>

              <div className="grid grid-cols-1 gap-8">
                {/* FHG Matrix Odds Explanation */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg mr-4">
                        <div className="text-2xl">📊</div>
                      </div>
                      <h3 className="text-2xl font-bold text-white">FHG Matrix Odds System</h3>
                    </div>
                    
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>
                        The First Half Goals (FHG) Matrix uses dynamic odds based on the Pregame Goal Line to calculate profits and ROI. 
                        This approach reflects real-world betting scenarios where FHG odds vary depending on the expected total goals in a match.
                      </p>
                      
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-6 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-blue-400 mb-3">Odds Structure:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Line ≥ 3.25:</span> <span className="text-white font-mono">1.44</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 3.0:</span> <span className="text-white font-mono">1.50</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.75:</span> <span className="text-white font-mono">1.50</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.5:</span> <span className="text-white font-mono">1.55</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.25:</span> <span className="text-white font-mono">1.65</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.0:</span> <span className="text-white font-mono">1.70</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line ≤ 1.75:</span> <span className="text-white font-mono">1.90</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Default:</span> <span className="text-white font-mono">1.70</span>
                          </div>
                        </div>
                      </div>
                      
                      <p>
                        <strong className="text-blue-400">Logic:</strong> Lower goal lines (defensive games) offer higher FHG odds since first half goals are less likely. 
                        Higher goal lines (attacking games) offer lower FHG odds as goals are more probable early in the match.
                      </p>
                    </div>
                  </div>
                </div>

                {/* B30 Odds Explanation */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-amber-500/30 transition-all duration-300">
                    <div className="flex items-center mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg mr-4">
                        <div className="text-2xl">⏱️</div>
                      </div>
                      <h3 className="text-2xl font-bold text-white">Before 30 Minutes (B30) Odds System</h3>
                    </div>
                    
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>
                        The Before 30 Minutes analysis uses a specialized odds structure that accounts for the increased difficulty 
                        of predicting not just that a goal will occur, but that it will happen within the first 30 minutes of the match.
                      </p>
                      
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-6 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-amber-400 mb-3">B30 Odds Structure:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Line ≥ 3.25:</span> <span className="text-white font-mono">1.55</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 3.0:</span> <span className="text-white font-mono">1.63</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.75:</span> <span className="text-white font-mono">1.72</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.5:</span> <span className="text-white font-mono">1.90</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.25:</span> <span className="text-white font-mono">2.00</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 2.0:</span> <span className="text-white font-mono">2.25</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line = 1.75:</span> <span className="text-white font-mono">2.60</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Line ≤ 1.5:</span> <span className="text-white font-mono">2.80</span>
                          </div>
                        </div>
                      </div>
                      
                      <p>
                        <strong className="text-amber-400">Timing Analysis:</strong> Games are considered wins if the first goal occurs between minutes 0-30. 
                        Games with goals after the 30th minute are losses. Matches without goal timing data are excluded from the analysis.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Double Chance Explanation */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700/20 hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg mr-4">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <h3 className="text-2xl font-bold text-white">Double Chance Strategy Logic</h3>
                    </div>
                    
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>
                        The Double Chance analysis implements intelligent bet optimization by automatically switching to Home Moneyline 
                        when Home/Draw odds are too low, and filtering out unprofitable bet types entirely.
                      </p>
                      
                      <div className="bg-gradient-to-r from-slate-700/30 to-gray-700/30 rounded-lg p-6 border border-slate-600/20">
                        <h4 className="text-lg font-semibold text-emerald-400 mb-3">Strategy Rules:</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start">
                            <span className="text-emerald-400 font-bold mr-3">•</span>
                            <div>
                              <strong>Home/Draw:</strong> If odds &lt; 1.18, automatically switch to Home ML using Mythos odds for better value
                            </div>
                          </div>
                          <div className="flex items-start">
                            <span className="text-emerald-400 font-bold mr-3">•</span>
                            <div>
                              <strong>Home/Away:</strong> Only include bets with odds ≥ 1.2 to ensure minimum profit potential
                            </div>
                          </div>
                          <div className="flex items-start">
                            <span className="text-red-400 font-bold mr-3">•</span>
                            <div>
                              <strong>Away/Draw:</strong> Completely excluded from analysis due to poor historical performance
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p>
                        <strong className="text-emerald-400">Smart Optimization:</strong> This approach maximizes ROI by avoiding low-value bets 
                        and leveraging better odds when available, resulting in improved long-term profitability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

    </div>
        
    );
}

// npm run dev to start
// kill-port 3000 to kill
